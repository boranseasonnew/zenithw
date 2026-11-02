"""Prepared files, leases, spool budgeting and cleanup."""
import hmac
import logging
import os
import secrets
import shutil
import threading
import time
from collections import defaultdict
from flask import jsonify, request, send_file
from zenith.jobs.errors import SpoolBudgetExceeded
from zenith.security.errors import service_busy
from zenith.security.logging import _redact_log_text
from zenith.services.formats import DOWNLOAD_ID_RE, PREPARED_TOKEN_RE, _NON_MEDIA_EXTENSIONS

logger = logging.getLogger("zenithw")

_CLEANUP_WARNING_INTERVAL_SECONDS = 60

class FileStore:
    def __init__(self, runtime):
        self.runtime = runtime
        self._cleanup_warning_lock = threading.Lock()
        self._cleanup_warning_last = {}
        self._pending_cleanups = {}
        self._pending_cleanups_lock = threading.Lock()
        self._prepared_files = {}
        self._transfer_states = {}
        self._prepared_files_lock = threading.Lock()
        self._spool_lock = threading.Lock()
        self._spool_reservations = {}
        self._spool_paths = {}
        self._active_transfer_paths_lock = threading.Lock()
        self._active_transfer_paths = defaultdict(int)
        self.PENDING_CLEANUP_MAX_AGE = self.runtime.config.FFMPEG_TIMEOUT + self.runtime.config.DOWNLOAD_TIMEOUT_SECONDS + self.runtime.config.FILE_MAX_AGE

    def _validated_output_path(self, path, file_token, allowed_extensions=None):
        """yt-dlp'den gelen yolu DOWNLOAD_DIR içinde var olan güvenli dosyaya çevirir."""
        if not isinstance(path, (str, os.PathLike)):
            return None
        candidate = os.path.realpath(os.path.abspath(os.fspath(path)))
        download_root = os.path.realpath(os.path.abspath(self.runtime.config.DOWNLOAD_DIR))
        try:
            if os.path.commonpath((candidate, download_root)) != download_root:
                return None
        except ValueError:
            return None
        basename = os.path.basename(candidate)
        if not basename.startswith(f"{file_token}.") or not os.path.isfile(candidate):
            return None
        extension = os.path.splitext(candidate)[1].lower()
        if allowed_extensions is not None:
            if extension not in allowed_extensions:
                return None
        elif extension in _NON_MEDIA_EXTENSIONS:
            return None
        return candidate

    def resolve_downloaded_media_path(self, info, file_token):
        """yt-dlp'nin döndürdüğü resmi filepath alanlarından final medyayı bulur.

        Klasörü prefix ile taramak; subtitle, thumbnail, .part veya fragment dosyasını
        asıl medya sanabiliyordu. Burada yalnızca extraction sonucuna bağlı yollar
        kabul edilir ve her aday DOWNLOAD_DIR/file_token sınırına karşı doğrulanır.
        """
        if not isinstance(info, dict):
            return None
        candidates = [info.get("filepath"), info.get("_filename")]
        for item in info.get("requested_downloads") or ():
            if isinstance(item, dict):
                candidates.append(item.get("filepath"))
        for item in info.get("requested_formats") or ():
            if isinstance(item, dict):
                candidates.append(item.get("filepath"))
        for candidate in candidates:
            resolved = self._validated_output_path(candidate, file_token)
            if resolved:
                return resolved
        return None

    def resolve_downloaded_thumbnail_path(self, info, file_token):
        """Thumbnail sonucunu yt-dlp metadata'sından veya deterministik JPG yolundan bulur."""
        candidates = []
        if isinstance(info, dict):
            for item in info.get("thumbnails") or ():
                if isinstance(item, dict):
                    candidates.append(item.get("filepath"))
        candidates.append(os.path.join(self.runtime.config.DOWNLOAD_DIR, f"{file_token}.jpg"))
        for candidate in candidates:
            resolved = self._validated_output_path(candidate, file_token, {".jpg", ".jpeg"})
            if resolved:
                return resolved
        return None

    def _log_cleanup_failure(self, action, exc):
        """Surface best-effort cleanup failures without flooding the journal."""
        now = time.monotonic()
        with self._cleanup_warning_lock:
            previous = self._cleanup_warning_last.get(action, 0.0)
            if now - previous < _CLEANUP_WARNING_INTERVAL_SECONDS:
                return
            self._cleanup_warning_last[action] = now
        logger.warning("[CLEANUP] %s failed: %s", action, _redact_log_text(exc)[:200])

    def _register_cleanup(self, path):
        with self._pending_cleanups_lock:
            self._pending_cleanups[path] = time.time()

    def _unregister_cleanup(self, path):
        with self._pending_cleanups_lock:
            self._pending_cleanups.pop(path, None)

    def _spool_path_key(self, path):
        return os.path.normcase(os.path.realpath(os.path.abspath(path)))

    def acquire_transfer_path_lease(self, path):
        """Keep age-based cleanup away from a file while send_file is streaming it."""
        path_key = self._spool_path_key(path)
        with self._active_transfer_paths_lock:
            self._active_transfer_paths[path_key] += 1

    def release_transfer_path_lease(self, path):
        if not path:
            return
        path_key = self._spool_path_key(path)
        with self._active_transfer_paths_lock:
            if self._active_transfer_paths.get(path_key, 0) <= 1:
                self._active_transfer_paths.pop(path_key, None)
            else:
                self._active_transfer_paths[path_key] -= 1

    def is_transfer_path_leased(self, path):
        if not path:
            return False
        path_key = self._spool_path_key(path)
        with self._active_transfer_paths_lock:
            return self._active_transfer_paths.get(path_key, 0) > 0

    def cleanup_path_if_not_leased(self, path):
        """Atomically skip cleanup when a transfer owns the file path."""
        path_key = self._spool_path_key(path)
        with self._active_transfer_paths_lock:
            if self._active_transfer_paths.get(path_key, 0) > 0:
                return False
            self._force_cleanup(path)
            return True

    def reserve_spool(self, byte_count, purpose):
        """Reserve aggregate disk capacity before accepting an expensive job."""
        byte_count = max(0, int(byte_count))
        if byte_count <= 0 or byte_count > self.runtime.config.MAX_SPOOL_SIZE_BYTES:
            return None
        try:
            free_bytes = shutil.disk_usage(self.runtime.config.DOWNLOAD_DIR).free
        except OSError:
            return None
        with self._spool_lock:
            logical_total = sum(item["bytes"] for item in self._spool_reservations.values())
            active_reserved = sum(
                item["bytes"] for item in self._spool_reservations.values()
                if item["state"] == "active"
            )
            if logical_total + byte_count > self.runtime.config.MAX_SPOOL_SIZE_BYTES:
                return None
            # Prepared bytes are already reflected in free_bytes. Active reservations
            # are future growth, so subtract them before admitting another job.
            if free_bytes < self.runtime.config.MIN_FREE_DISK_BYTES + active_reserved + byte_count:
                return None
            reservation_id = secrets.token_urlsafe(24)
            self._spool_reservations[reservation_id] = {
                "bytes": byte_count,
                "purpose": purpose,
                "state": "active",
                "path": None,
            }
            return reservation_id

    def commit_spool(self, reservation_id, path, actual_bytes):
        """Convert an active estimate into the exact prepared-file reservation."""
        actual_bytes = max(0, int(actual_bytes))
        if not reservation_id or actual_bytes <= 0:
            return False
        path_key = self._spool_path_key(path)
        with self._spool_lock:
            record = self._spool_reservations.get(reservation_id)
            if not record:
                return False
            other_total = sum(
                item["bytes"] for key, item in self._spool_reservations.items()
                if key != reservation_id
            )
            if other_total + actual_bytes > self.runtime.config.MAX_SPOOL_SIZE_BYTES:
                return False
            old_path = record.get("path")
            if old_path:
                self._spool_paths.pop(old_path, None)
            record.update(bytes=actual_bytes, state="prepared", path=path_key)
            self._spool_paths[path_key] = reservation_id
            return True

    def release_spool(self, reservation_id):
        if not reservation_id:
            return
        with self._spool_lock:
            record = self._spool_reservations.pop(reservation_id, None)
            if record and record.get("path"):
                self._spool_paths.pop(record["path"], None)

    def release_spool_for_path(self, path):
        if not path:
            return
        path_key = self._spool_path_key(path)
        with self._spool_lock:
            reservation_id = self._spool_paths.pop(path_key, None)
            if reservation_id:
                self._spool_reservations.pop(reservation_id, None)

    def spool_snapshot(self):
        with self._spool_lock:
            records = list(self._spool_reservations.values())
        return {
            "reserved_bytes": sum(item["bytes"] for item in records),
            "active_reserved_bytes": sum(
                item["bytes"] for item in records if item["state"] == "active"
            ),
            "prepared_bytes": sum(
                item["bytes"] for item in records if item["state"] == "prepared"
            ),
        }

    def has_minimum_free_disk(self):
        try:
            return shutil.disk_usage(self.runtime.config.DOWNLOAD_DIR).free >= self.runtime.config.MIN_FREE_DISK_BYTES
        except OSError:
            return False

    def _force_cleanup(self, path):
        """Dosyayı diskten siler ve pending_cleanups'tan çıkarır.
        NOT: _pending_cleanups_lock tutulurken çağrılmamalı -- kendi içinde
        locku alır (reentrant olmayan threading.Lock nedeniyle nested acquire
        deadlock'a yol açar)."""
        removed = False
        try:
            if path and os.path.exists(path):
                os.remove(path)
            removed = not path or not os.path.exists(path)
        except Exception as exc:
            self._log_cleanup_failure("remove temporary file", exc)
        try:
            if removed:
                self.release_spool_for_path(path)
            with self._pending_cleanups_lock:
                if removed:
                    self._pending_cleanups.pop(path, None)
        except Exception as exc:
            self._log_cleanup_failure("unregister temporary file", exc)

    def cleanup_download_artifacts(self, file_token, keep_paths=None):
        """Remove only files belonging to one internal download token.

        yt-dlp may leave .part, subtitle, thumbnail or post-processing files behind
        after cancellation and timeout. Requiring an exact token or ``token.``
        prefix prevents a short token from deleting another job's artifacts.
        """
        if not isinstance(file_token, str) or not DOWNLOAD_ID_RE.fullmatch(file_token):
            return 0
        keep_keys = {
            self._spool_path_key(path)
            for path in (keep_paths or ())
            if path
        }
        try:
            names = os.listdir(self.runtime.config.DOWNLOAD_DIR)
        except OSError:
            return 0
        removed = 0
        for name in names:
            if name != file_token and not name.startswith(f"{file_token}."):
                continue
            path = os.path.join(self.runtime.config.DOWNLOAD_DIR, name)
            if not os.path.isfile(path):
                continue
            if self._spool_path_key(path) in keep_keys:
                continue
            existed = os.path.exists(path)
            self._force_cleanup(path)
            if existed and not os.path.exists(path):
                removed += 1
        return removed

    def prepare_native_download(self, path, download_name, owner_ip, reservation_id):
        """Tamamlanan dosyayı kısa ömürlü, tahmin edilemez bir indirme token'ına bağlar."""
        try:
            actual_bytes = os.path.getsize(path)
        except OSError as exc:
            raise SpoolBudgetExceeded("Prepared file is no longer available") from exc
        if not self.commit_spool(reservation_id, path, actual_bytes):
            raise SpoolBudgetExceeded("Prepared-file spool budget exceeded")
        expires_at = time.time() + self.runtime.config.PREPARED_FILE_TTL
        with self._prepared_files_lock:
            while True:
                token = secrets.token_urlsafe(32)
                if token not in self._prepared_files:
                    self._prepared_files[token] = {
                        "path": path,
                        "download_name": download_name,
                        "owner_ip": owner_ip,
                        "expires_at": expires_at,
                        "reservation_id": reservation_id,
                    }
                    self._transfer_states[token] = {
                        "state": "prepared",
                        "owner_ip": owner_ip,
                        "expected_bytes": actual_bytes,
                        "transferred_bytes": 0,
                        "expires_at": expires_at,
                    }
                    return token

    def cleanup_expired_prepared_files(self):
        now = time.time()
        expired_paths = []
        with self._prepared_files_lock:
            for token, entry in list(self._prepared_files.items()):
                if now >= entry["expires_at"]:
                    expired_paths.append(entry["path"])
                    del self._prepared_files[token]
                    state = self._transfer_states.get(token)
                    if state:
                        state.update(state="expired", expires_at=now + self.runtime.config.PREPARED_FILE_TTL)
            for token, state in list(self._transfer_states.items()):
                if token not in self._prepared_files and now >= state["expires_at"]:
                    del self._transfer_states[token]
        for path in expired_paths:
            self._force_cleanup(path)

    def cleanup_old_files(self):
        try:
            now = time.time()
            for f in os.listdir(self.runtime.config.DOWNLOAD_DIR):
                fpath = os.path.join(self.runtime.config.DOWNLOAD_DIR, f)
                if os.path.isfile(fpath) and now - os.path.getmtime(fpath) > self.runtime.config.FILE_MAX_AGE:
                    self.cleanup_path_if_not_leased(fpath)
            # YENİ: pending_cleanups'ta uzun süredir (PENDING_CLEANUP_MAX_AGE'den
            # fazla) bekleyen, yani normal akışta hiç kapanmamış/unutulmuş
            # kayıtları zorla temizle. Lock'u sadece snapshot almak için tutuyoruz;
            # _force_cleanup() kendi locku aldığı için burada lock tutarken
            # çağrılmıyor (deadlock önlemi).
            with self._pending_cleanups_lock:
                stale_paths = [p for p, ts in self._pending_cleanups.items()
                               if now - ts > self.PENDING_CLEANUP_MAX_AGE]
            for path in stale_paths:
                self.cleanup_path_if_not_leased(path)
        except Exception as e:
            logger.error("[CLEANUP] Failed to clean old files: %s", _redact_log_text(e))

    def periodic_cleanup(self):
        while not self.runtime.stopping.wait(self.runtime.config.FILE_CLEANUP_INTERVAL):
            self.cleanup_old_files()
            self.runtime.jobs.cleanup_stale_cancel_events()  # YENİ
            self.cleanup_expired_prepared_files()

    def periodic_prepared_file_cleanup(self):
        while not self.runtime.stopping.wait(60):
            self.cleanup_expired_prepared_files()

    def update_transfer_state(self, token, state, transferred_bytes=None, *, terminal=False):
        with self._prepared_files_lock:
            entry = self._transfer_states.get(token)
            if not entry:
                return
            entry["state"] = state
            if transferred_bytes is not None:
                entry["transferred_bytes"] = max(0, int(transferred_bytes))
            entry["expires_at"] = time.time() + (
                self.runtime.config.PREPARED_FILE_TTL if terminal else self.PENDING_CLEANUP_MAX_AGE
            )

    def download_prepared_file(self, token):
        if not PREPARED_TOKEN_RE.fullmatch(token):
            return jsonify({"error": "Not Found"}), 404

        owner_ip = self.runtime.security.get_client_ip()
        preliminary_expired_path = None
        with self._prepared_files_lock:
            preliminary = self._prepared_files.get(token)
            if preliminary is None:
                return jsonify({"error": "Download expired or already used"}), 410
            if time.time() >= preliminary["expires_at"]:
                preliminary_expired_path = preliminary["path"]
                del self._prepared_files[token]
                state = self._transfer_states.get(token)
                if state:
                    state.update(state="expired", expires_at=time.time() + self.runtime.config.PREPARED_FILE_TTL)
            elif not hmac.compare_digest(preliminary["owner_ip"], owner_ip):
                return jsonify({"error": "Not Found"}), 404
        if preliminary_expired_path is not None:
            self._force_cleanup(preliminary_expired_path)
            return jsonify({"error": "Download expired"}), 410

        transfer_acquired = False
        transfer_path_leased = False
        path = None
        if request.method != "HEAD":
            if not self.runtime.jobs.acquire_transfer_slot(owner_ip):
                return service_busy(
                    "Too many active file transfers. Please try again shortly.",
                    retry_after=5,
                )
            transfer_acquired = True

        expired_path = None
        try:
            with self._prepared_files_lock:
                entry = self._prepared_files.get(token)
                if entry is None:
                    return jsonify({"error": "Download expired or already used"}), 410
                path = entry["path"]
                download_name = entry["download_name"]
                expected_ip = entry["owner_ip"]
                expires_at = entry["expires_at"]
                if time.time() >= expires_at:
                    expired_path = path
                    del self._prepared_files[token]
                elif not hmac.compare_digest(expected_ip, owner_ip):
                    return jsonify({"error": "Not Found"}), 404
                elif request.method != "HEAD":
                    # Token tek kullanımlıktır; eşzamanlı ikinci GET aynı dosyayı açamaz.
                    del self._prepared_files[token]

            if expired_path is not None:
                self.update_transfer_state(token, "expired", 0, terminal=True)
                self._force_cleanup(expired_path)
                return jsonify({"error": "Download expired"}), 410

            if request.method != "HEAD":
                # Take the lease before checking/opening the file. The age sweeper
                # uses the same lock for its cleanup decision, so it either finishes
                # first (and this request returns 410) or waits until transfer close.
                self.acquire_transfer_path_lease(path)
                transfer_path_leased = True
                self.update_transfer_state(token, "transferring", 0)

            if not os.path.isfile(path):
                self.update_transfer_state(token, "failed", 0, terminal=True)
                self._force_cleanup(path)
                return jsonify({"error": "Download no longer available"}), 410

            try:
                response = send_file(path, as_attachment=True, download_name=download_name)
            except Exception:
                self.update_transfer_state(token, "failed", 0, terminal=True)
                if transfer_path_leased:
                    self.release_transfer_path_lease(path)
                    transfer_path_leased = False
                self._force_cleanup(path)
                raise

            if request.method != "HEAD":
                original_iterable = response.response
                expected_bytes = os.path.getsize(path)

                def _tracked_transfer():
                    transferred = 0
                    last_reported = 0
                    try:
                        for chunk in original_iterable:
                            transferred += len(chunk)
                            if transferred - last_reported >= 1024 * 1024:
                                self.update_transfer_state(token, "transferring", transferred)
                                last_reported = transferred
                            yield chunk
                        terminal_state = "completed" if transferred >= expected_bytes else "interrupted"
                        self.update_transfer_state(token, terminal_state, transferred, terminal=True)
                    except BaseException:
                        self.update_transfer_state(token, "interrupted", transferred, terminal=True)
                        raise
                    finally:
                        close_iterable = getattr(original_iterable, "close", None)
                        if close_iterable:
                            close_iterable()

                response.response = _tracked_transfer()
                # send_file() enables direct_passthrough. In that mode Werkzeug
                # returns the raw iterable and skips Response.close(), so
                # call_on_close callbacks never run under Gunicorn. Disable it
                # after installing our streaming generator to guarantee that the
                # transfer slot, path lease and temporary file are released.
                response.direct_passthrough = False

                @response.call_on_close
                def _cleanup_prepared_file():
                    try:
                        self._force_cleanup(path)
                    finally:
                        self.release_transfer_path_lease(path)
                        self.runtime.jobs.release_transfer_slot(owner_ip)

                transfer_acquired = False
                transfer_path_leased = False

            return response
        finally:
            if transfer_path_leased:
                self.release_transfer_path_lease(path)
            if transfer_acquired:
                self.runtime.jobs.release_transfer_slot(owner_ip)

    def prepared_transfer_status(self, token):
        if not PREPARED_TOKEN_RE.fullmatch(token):
            return jsonify({"error": "Not Found"}), 404
        owner_ip = self.runtime.security.get_client_ip()
        with self._prepared_files_lock:
            state = self._transfer_states.get(token)
            if not state or not hmac.compare_digest(state["owner_ip"], owner_ip):
                return jsonify({"error": "Not Found"}), 404
            if state["state"] == "transferring":
                # An actively polled native transfer may be slow. Keep its status
                # record alive while the owning browser is still following it.
                state["expires_at"] = time.time() + self.PENDING_CLEANUP_MAX_AGE
            payload = {
                "state": state["state"],
                "expected_bytes": state["expected_bytes"],
                "transferred_bytes": state["transferred_bytes"],
            }
        response = jsonify(payload)
        response.headers["Cache-Control"] = "no-store, max-age=0"
        return response, 200
