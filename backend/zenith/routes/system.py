"""Status, cancellation and API response policy."""
import hmac
import os
import shutil
from flask import jsonify, request
from zenith.services.formats import DOWNLOAD_ID_RE

class SystemEndpoints:
    def __init__(self, runtime):
        self.runtime = runtime

    def health(self):
        # Liveness is intentionally payload-free. Detailed readiness belongs to
        # /ready and private diagnostics, never to the public probe endpoint.
        response = self.runtime.app.response_class(status=204)
        response.headers["Cache-Control"] = "no-store, max-age=0"
        response.headers["X-Robots-Tag"] = "noindex, nofollow"
        return response

    def readiness(self):
        spool = self.runtime.files.spool_snapshot()
        # reserved_bytes is already the total of both active and prepared
        # reservations. Adding prepared_bytes again double-counted files waiting
        # for browser transfer and could make an otherwise healthy AWS worker
        # return 503 from /ready.
        logical_spool = spool["reserved_bytes"]
        ready = bool(
            self.runtime.engine.FFMPEG_DIR
            and self.runtime.engine._DENO_PATH
            and self.runtime.engine._EJS_AVAILABLE
            and self.runtime.files.has_minimum_free_disk()
            and logical_spool < self.runtime.config.MAX_SPOOL_SIZE_BYTES
        )
        response = jsonify({"status": "ready" if ready else "unavailable"})
        response.headers["Cache-Control"] = "no-store, max-age=0"
        return response, 200 if ready else 503

    def public_status(self):
        """Expose only the operational fields used by the public status page."""
        media_ready = bool(self.runtime.engine.FFMPEG_DIR)
        response = jsonify({
            "status": "maintenance" if self.runtime.config.MAINTENANCE_MODE else "operational",
            "components": {
                "api": "operational",
                "media_processing": "operational" if media_ready else "degraded",
                "job_intake": "maintenance" if self.runtime.config.MAINTENANCE_MODE else "operational",
            },
        })
        response.headers["Cache-Control"] = "no-store, max-age=0"
        return response, 200

    def diagnostics(self):
        authorization = request.headers.get("Authorization", "")
        supplied_token = authorization[7:].strip() if authorization.startswith("Bearer ") else ""
        if not (
            self.runtime.config.DIAGNOSTICS_TOKEN
            and supplied_token
            and hmac.compare_digest(supplied_token, self.runtime.config.DIAGNOSTICS_TOKEN)
        ):
            response = jsonify({"error": "Not Found"})
            response.headers["Cache-Control"] = "no-store, max-age=0"
            return response, 404

        # YENİ: queue_lock ile korundu, race condition önlendi
        with self.runtime.jobs.queue_lock:
            _active = self.runtime.jobs.active_downloads_count
            _waiting = self.runtime.jobs.queue_waiting
        # NOT: os.listdir(DOWNLOAD_DIR) yerine zaten bakımı yapılan
        # _pending_cleanups sayacı kullanılıyor -- /health sık pollanabilen bir
        # endpoint olduğu için her çağrıda dizin taramak gereksiz I/O ekliyordu
        # (bkz. OPTIMIZATIONS.md Finding 7).
        with self.runtime.files._pending_cleanups_lock:
            _disk_files = len(self.runtime.files._pending_cleanups)
        with self.runtime.jobs.transfer_lock:
            _active_transfers = self.runtime.jobs.active_transfers_count
        with self.runtime.metadata.info_cache_lock:
            _info_cache_entries = len(self.runtime.metadata.info_response_cache)
            _info_inflight = len(self.runtime.metadata.info_inflight)
            _info_cache_hits = self.runtime.metadata.info_cache_hits
            _info_cache_misses = self.runtime.metadata.info_cache_misses
        _spool = self.runtime.files.spool_snapshot()
        try:
            _free_disk = shutil.disk_usage(self.runtime.config.DOWNLOAD_DIR).free
        except OSError:
            _free_disk = 0
        response = jsonify({
            "status": "ok",
            "maintenance": self.runtime.config.MAINTENANCE_MODE,
            "maintenance_message": self.runtime.config.MAINTENANCE_MESSAGE if self.runtime.config.MAINTENANCE_MODE else "",
            "maintenance_until": self.runtime.config.MAINTENANCE_UNTIL if self.runtime.config.MAINTENANCE_MODE else "",
            "deployment_mode": "single_worker_process_local_state",
            "horizontal_scaling_safe": False,
            "expected_gunicorn_workers": 1,
            "ffmpeg": f"OK ({self.runtime.engine.FFMPEG_DIR})" if self.runtime.engine.FFMPEG_DIR else "MISSING",
            "js_solver": "OK" if (self.runtime.engine._DENO_PATH and self.runtime.engine._EJS_AVAILABLE) else "INCOMPLETE",
            "po_token_provider": "CONFIGURED" if self.runtime.config.POT_PROVIDER_URL else "DISABLED",
            "youtube": self.runtime.engine.youtube_health.snapshot(self.runtime.config.COOKIES_FILE),
            "youtube_provider_health": self.runtime.engine.youtube_provider_health(),
            "cookies": f"Loaded ({os.path.getsize(self.runtime.config.COOKIES_FILE)} bytes)" if os.path.exists(self.runtime.config.COOKIES_FILE) else "Missing",
            "disk_files": _disk_files,
            "active_downloads": _active,
            "max_concurrent_downloads": self.runtime.config.MAX_CONCURRENT_DOWNLOADS,
            "max_download_queue": self.runtime.config.MAX_DOWNLOAD_QUEUE,
            "queue_waiting": _waiting,
            "active_transfers": _active_transfers,
            "max_concurrent_transfers": self.runtime.config.MAX_CONCURRENT_TRANSFERS,
            "spool_reserved_bytes": _spool["reserved_bytes"],
            "spool_prepared_bytes": _spool["prepared_bytes"],
            "max_spool_bytes": self.runtime.config.MAX_SPOOL_SIZE_BYTES,
            "free_disk_bytes": _free_disk,
            "info_cache_entries": _info_cache_entries,
            "info_inflight": _info_inflight,
            "info_cache_hits": _info_cache_hits,
            "info_cache_misses": _info_cache_misses,
        })
        response.headers["Cache-Control"] = "no-store, max-age=0"
        return response, 200

    def robots(self):
        return "User-agent: *\nDisallow: /\n", 200, {'Content-Type': 'text/plain'}

    def cancel_route(self):
        ip = self.runtime.security.get_client_ip()
        if not self.runtime.security.cancel_rate_limiter.add(ip):
            return jsonify({"error": "Too many requests. Please wait 1 minute."}), 429
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({"error": "Invalid request body"}), 400
        download_id = data.get("download_id", "")
        if download_id:
            if not isinstance(download_id, str) or not DOWNLOAD_ID_RE.fullmatch(download_id.strip()):
                return jsonify({"error": "Invalid download_id"}), 400
            download_id = download_id.strip()
            with self.runtime.jobs.cancel_events_lock:
                entry = self.runtime.jobs.cancel_events.get(download_id)
                if entry and entry[1] == ip:
                    entry[0].set()
                    # Kayıt, indirme greenlet'i gerçekten sonlanana kadar tutulur.
                    # Burada silmek aynı ID'nin erken yeniden ayrılmasına ve eski
                    # isteğin yeni kaydı temizlemesine izin verirdi.
            return jsonify({"ok": True}), 200
        return jsonify({"error": "download_id required"}), 400

    def api_root(self):
        return jsonify({
            "service": "zenithw-api",
            "status": "ok",
            "message": "This is an API endpoint. Visit zenithw.space for the web interface."
        }), 200

    def not_found(self, e):
        return jsonify({"error": "Not Found"}), 404

    def request_too_large(self, e):
        max_mb = self.runtime.config.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)
        return jsonify({
            "error": f"Uploaded file exceeds the {max_mb} MB limit.",
            "error_code": "file_too_large",
        }), 413

    def prevent_api_indexing(self, response):
        """API uçlarının arama sonucu olarak dizine alınmasını engelle."""
        response.headers.setdefault("X-Robots-Tag", "noindex, nofollow")
        # Every response on this service is API/job/transfer state, including errors.
        # send_file's default no-cache permits storage, so replace it for token files.
        response.headers["Cache-Control"] = "private, no-store, max-age=0"
        response.headers["CDN-Cache-Control"] = "no-store"
        response.headers["Cloudflare-CDN-Cache-Control"] = "no-store"
        response.headers.pop("Expires", None)
        return response

    def debug_headers(self):
            """
            SADECE development ortamında aktif. Production'da bu route hiç
            register edilmez (bkz. FLASK_ENV kontrolü). Sekret değeri hâlâ
            expose edilmez; sadece var/yok ve eşleşme durumu döner.
            """
            return jsonify({
                "received_x_origin_verify_present": "X-Origin-Verify" in request.headers,
                "expected_value_set": bool(self.runtime.config.ORIGIN_SECRET_VALUE),
                "match": request.headers.get("X-Origin-Verify", "") == self.runtime.config.ORIGIN_SECRET_VALUE,
                "cf_ray_present": "CF-Ray" in request.headers,
                "cf_connecting_ip_present": "CF-Connecting-IP" in request.headers,
            }), 200
