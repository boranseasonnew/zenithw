"""Per-application queues, cancellation and Socket.IO ownership."""
import hmac
import logging
import threading
import time
import uuid
import yt_dlp
from collections import defaultdict
from flask import request
from zenith.jobs.errors import DownloadQueueFull, DownloadQueueTimeout
from zenith.services.formats import DOWNLOAD_ID_RE

logger = logging.getLogger("zenithw")

class JobRegistry:
    def __init__(self, runtime):
        self.runtime = runtime
        self.download_slots = threading.Semaphore(self.runtime.config.MAX_CONCURRENT_DOWNLOADS)
        self.conversion_slots = threading.Semaphore(self.runtime.config.MAX_CONCURRENT_CONVERSIONS)
        self.info_slots = threading.Semaphore(self.runtime.config.MAX_CONCURRENT_INFO)
        self.thumbnail_slots = threading.Semaphore(self.runtime.config.MAX_CONCURRENT_THUMBNAILS)
        self.transfer_slots = threading.Semaphore(self.runtime.config.MAX_CONCURRENT_TRANSFERS)
        self.transfer_lock = threading.Lock()
        self.active_transfers_count = 0
        self.active_transfers_per_ip = defaultdict(int)
        self.transfer_waiting_count = 0
        self.transfer_waiting_per_ip = defaultdict(int)
        self.queue_lock = threading.Lock()
        self.queue_waiting = 0
        self.active_downloads_count = 0
        self.cancel_events = {}
        self.cancel_events_lock = threading.Lock()
        self.connected_sids = {}
        self.connected_sids_lock = threading.Lock()

    def acquire_transfer_slot(self, ip):
        """Bound both active transfers and waiting requests; preserve unused tokens."""
        pass  # Shared state is owned by this application runtime.
        with self.transfer_lock:
            if (self.transfer_waiting_count >= self.runtime.config.MAX_TRANSFER_QUEUE
                    or self.transfer_waiting_per_ip.get(ip, 0) >= self.runtime.config.MAX_TRANSFER_QUEUE_PER_IP):
                return False
            self.transfer_waiting_count += 1
            self.transfer_waiting_per_ip[ip] += 1
        try:
            deadline = time.monotonic() + self.runtime.config.TRANSFER_QUEUE_WAIT_SECONDS
            while True:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    return False
                if not self.transfer_slots.acquire(blocking=True, timeout=min(1, remaining)):
                    continue
                with self.transfer_lock:
                    if self.active_transfers_per_ip[ip] < self.runtime.config.MAX_CONCURRENT_TRANSFERS_PER_IP:
                        self.active_transfers_per_ip[ip] += 1
                        self.active_transfers_count += 1
                        return True
                self.transfer_slots.release()
                time.sleep(min(0.25, max(0, remaining)))
        finally:
            with self.transfer_lock:
                self.transfer_waiting_count -= 1
                self.transfer_waiting_per_ip[ip] -= 1
                if self.transfer_waiting_per_ip[ip] <= 0:
                    self.transfer_waiting_per_ip.pop(ip, None)

    def release_transfer_slot(self, ip):
        pass  # Shared state is owned by this application runtime.
        with self.transfer_lock:
            if self.active_transfers_per_ip.get(ip, 0) > 0:
                self.active_transfers_per_ip[ip] -= 1
                if self.active_transfers_per_ip[ip] <= 0:
                    self.active_transfers_per_ip.pop(ip, None)
                self.active_transfers_count = max(0, self.active_transfers_count - 1)
                self.transfer_slots.release()

    def _release_download_slot(self):
        pass  # Shared state is owned by this application runtime.
        self.download_slots.release()
        with self.queue_lock:
            self.active_downloads_count = max(0, self.active_downloads_count - 1)

    def acquire_download_slot(self, sid, cancel_event, download_id):
        """Slot boşalana kadar bekler; iptal edilirse DownloadCancelled fırlatır."""
        pass  # Shared state is owned by this application runtime.
        with self.queue_lock:
            if self.queue_waiting >= self.runtime.config.MAX_DOWNLOAD_QUEUE:
                raise DownloadQueueFull("Download queue is full")
            self.queue_waiting += 1
        wait_deadline = time.monotonic() + self.runtime.config.MAX_QUEUE_WAIT_SECONDS
        last_queue_emit = 0.0
        last_ahead = None
        try:
            while True:
                if cancel_event.is_set():
                    raise yt_dlp.utils.DownloadCancelled("Cancelled")
                remaining = wait_deadline - time.monotonic()
                if remaining <= 0:
                    raise DownloadQueueTimeout("Download queue wait timed out")
                if self.download_slots.acquire(blocking=True, timeout=min(1, remaining)):
                    with self.queue_lock:
                        self.active_downloads_count += 1
                    return True
                if sid:
                    with self.queue_lock:
                        ahead = max(0, self.queue_waiting - 1)
                    now = time.monotonic()
                    if ahead != last_ahead or now - last_queue_emit >= 5:
                        try:
                            self.runtime.socketio.emit('progress', {
                                'download_id': download_id,
                                'status': 'queued',
                                'message': f"Server is busy, waiting in queue... ({ahead} ahead)"
                            }, room=sid)
                            last_queue_emit = now
                            last_ahead = ahead
                        except Exception:
                            pass  # Emit başarısız olsa bile kuyruk beklemeye devam etsin
        finally:
            with self.queue_lock:
                self.queue_waiting = max(0, self.queue_waiting - 1)

    def reserve_download_id(self, requested_id, cancel_event, ip):
        """Geçerli ve aktif kayıtlarla çakışmayan bir download_id ayırır.

        Frontend iptal isteğini indirme tamamlanmadan gönderebildiği için istemcinin
        ürettiği ID korunur; fakat formatı doğrulanır ve aynı aktif ID'nin başka bir
        isteği ezmesine izin verilmez.
        """
        if requested_id not in (None, ""):
            if not isinstance(requested_id, str):
                raise ValueError("Invalid download_id")
            candidate = requested_id.strip()
            if not DOWNLOAD_ID_RE.fullmatch(candidate):
                raise ValueError("Invalid download_id")
            with self.cancel_events_lock:
                if candidate in self.cancel_events:
                    return None
                self.cancel_events[candidate] = (cancel_event, ip, time.time())
            return candidate

        # Server-generated UUID çakışması teorik olarak mümkün olduğundan kayıt
        # kontrolü ve ekleme aynı lock altında yapılır.
        with self.cancel_events_lock:
            while True:
                candidate = str(uuid.uuid4())
                if candidate not in self.cancel_events:
                    self.cancel_events[candidate] = (cancel_event, ip, time.time())
                    return candidate

    def discard_cancel_event(self, download_id):
        """Idempotently release one request's process-local cancellation record."""
        if not download_id:
            return
        with self.cancel_events_lock:
            self.cancel_events.pop(download_id, None)

    def cleanup_stale_cancel_events(self):
        now = time.time()
        with self.cancel_events_lock:
            stale = []
            for dl_id, entry in self.cancel_events.items():
                # entry: (event, ip, timestamp)
                if len(entry) >= 3 and now - entry[2] > self.runtime.config.CANCEL_EVENT_MAX_AGE:
                    stale.append(dl_id)
            for dl_id in stale:
                del self.cancel_events[dl_id]
                logger.info(f"[CANCEL CLEANUP] Removed stale cancel_event: {dl_id}")

    def validate_sid(self, sid, owner_ip):
        if not isinstance(sid, str) or not sid or len(sid) > 128:
            return ""
        with self.connected_sids_lock:
            now = time.time()
            # Eski kayıtları temizle
            stale = [
                connected_sid
                for connected_sid, entry in self.connected_sids.items()
                if now - entry["last_seen"] > self.runtime.config.CONNECTED_SID_MAX_AGE
            ]
            for s in stale:
                del self.connected_sids[s]
            # SID geçerli mi kontrol et
            entry = self.connected_sids.get(sid)
            if entry and hmac.compare_digest(entry["ip"], owner_ip):
                entry["last_seen"] = now
                return sid
            return ""

    def safe_emit(self, event, data, room=None):
        """SocketIO emit wrapper with error handling."""
        try:
            self.runtime.socketio.emit(event, data, room=room)
        except Exception as e:
            logger.warning(f"[SOCKET] Emit failed for room {room}: {e}")

    def emit_job_progress(self, sid, download_id, payload):
        """Scope every progress event to the immutable client job identifier."""
        if not sid:
            return
        scoped_payload = dict(payload)
        scoped_payload["download_id"] = download_id
        self.safe_emit("progress", scoped_payload, room=sid)

    def on_connect(self):
        client_ip = self.runtime.security.get_client_ip()
        now = time.time()
        with self.connected_sids_lock:
            stale = [
                sid
                for sid, entry in self.connected_sids.items()
                if now - entry["last_seen"] > self.runtime.config.CONNECTED_SID_MAX_AGE
            ]
            for sid in stale:
                self.connected_sids.pop(sid, None)

            per_ip_count = sum(
                1 for entry in self.connected_sids.values() if entry["ip"] == client_ip
            )
            if (
                len(self.connected_sids) >= self.runtime.config.MAX_SOCKET_CONNECTIONS
                or per_ip_count >= self.runtime.config.MAX_SOCKET_CONNECTIONS_PER_IP
            ):
                logger.warning(
                    "[SOCKET] connection limit reached for ip=%s active=%s per_ip=%s",
                    client_ip,
                    len(self.connected_sids),
                    per_ip_count,
                )
                return False
            self.connected_sids[request.sid] = {"last_seen": now, "ip": client_ip}
        logger.info("+ %s", request.sid)

    def on_disconnect(self):
        with self.connected_sids_lock:
            self.connected_sids.pop(request.sid, None)
        logger.info("- %s", request.sid)
