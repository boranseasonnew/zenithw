"""Request authentication, quotas and maintenance policy."""
import hashlib
import hmac
import ipaddress
import logging
import math
import os
import threading
import time
from collections import defaultdict
from flask import g, jsonify, request
from zenith.jobs.cache import TTLCache
from zenith.security.errors import rate_limit_response
from zenith.security.logging import _safe_log_url
from zenith.security.urls import is_youtube

logger = logging.getLogger("zenithw")

class RequestSecurity:
    def __init__(self, runtime):
        self.runtime = runtime
        self.rate_limiter = TTLCache(
            ttl=self.runtime.config.RATE_LIMIT_WINDOW,
            max_size=10000,
            max_requests=self.runtime.config.RATE_LIMIT_MAX_REQUESTS,
        )
        self.info_rate_limiter = TTLCache(
            ttl=self.runtime.config.RATE_LIMIT_WINDOW,
            max_size=10000,
            max_requests=self.runtime.config.INFO_RATE_LIMIT_MAX_REQUESTS,
        )
        self.thumbnail_rate_limiter = TTLCache(
            ttl=self.runtime.config.RATE_LIMIT_WINDOW,
            max_size=10000,
            max_requests=self.runtime.config.THUMBNAIL_RATE_LIMIT_MAX_REQUESTS,
        )
        self.conversion_rate_limiter = TTLCache(
            ttl=self.runtime.config.CONVERSION_RATE_LIMIT_WINDOW,
            max_size=10000,
            max_requests=self.runtime.config.CONVERSION_RATE_LIMIT_MAX_REQUESTS,
        )
        self.cancel_rate_limiter = TTLCache(
            ttl=self.runtime.config.CANCEL_RATE_LIMIT_WINDOW,
            max_size=10000,
            max_requests=self.runtime.config.CANCEL_RATE_LIMIT_MAX_REQUESTS,
        )
        self.youtube_info_ip_limiter = TTLCache(
            ttl=self.runtime.config.YOUTUBE_RATE_LIMIT_WINDOW, max_size=10000, max_requests=self.runtime.config.YOUTUBE_INFO_PER_IP
        )
        self.youtube_info_global_limiter = TTLCache(
            ttl=self.runtime.config.YOUTUBE_RATE_LIMIT_WINDOW, max_size=4, max_requests=self.runtime.config.YOUTUBE_INFO_GLOBAL
        )
        self.youtube_download_ip_limiter = TTLCache(
            ttl=self.runtime.config.YOUTUBE_RATE_LIMIT_WINDOW, max_size=10000, max_requests=self.runtime.config.YOUTUBE_DOWNLOADS_PER_IP
        )
        self.youtube_download_global_limiter = TTLCache(
            ttl=self.runtime.config.YOUTUBE_RATE_LIMIT_WINDOW, max_size=4, max_requests=self.runtime.config.YOUTUBE_DOWNLOADS_GLOBAL
        )
        self._youtube_download_guard_lock = threading.Lock()
        self._youtube_download_guard = {}
        self.concurrent_ip_lock = threading.Lock()
        self.concurrent_ip_counts = defaultdict(int)

    def _normalize_client_ip(self, value):
        try:
            return str(ipaddress.ip_address((value or "").strip()))
        except ValueError:
            return ""

    def get_client_ip(self):
        remote_ip = self._normalize_client_ip(request.remote_addr)
        if self.runtime.config.TRUST_PROXY:
            # CF-Connecting-IP is accepted only when the direct/proxy-resolved peer
            # is Cloudflare or the request carries the shared Cloudflare origin
            # secret. This prevents a direct client from spoofing rate-limit keys.
            origin_secret_valid = bool(
                self.runtime.config.ORIGIN_SECRET_VALUE
                and hmac.compare_digest(
                    request.headers.get(self.runtime.config.ORIGIN_SECRET_HEADER, ""),
                    self.runtime.config.ORIGIN_SECRET_VALUE,
                )
            )
            cf_ip = request.headers.get('CF-Connecting-IP')
            if cf_ip and (origin_secret_valid or self._is_cloudflare_ip(remote_ip)):
                candidate = self._normalize_client_ip(cf_ip)
                if candidate:
                    return candidate
            # ProxyFix already reduced the configured trusted-hop chain to
            # request.remote_addr. Never parse a raw X-Forwarded-For value again.
        return remote_ip or "unknown"

    def check_rate_limit(self, ip):
        return self.rate_limiter.add(ip)

    def _is_cloudflare_ip(self, ip_str):
        try:
            ip = ipaddress.ip_address(ip_str)
        except ValueError:
            return False
        return any(ip in net for net in self.runtime.config._CF_NETWORKS)

    def _enforce_cloudflare_origin(self):
        if not self.runtime.config.ENABLE_ORIGIN_LOCK:
            return None
        if request.path in {"/health", "/ready"}:
            return None
        if os.environ.get("FLASK_ENV") == "development" and request.path == "/debug-headers":
            return None

        remote_ip = request.remote_addr or ""

        # NOT: Railway, Cloudflare ile container arasına kendi internal proxy'sini
        # ekliyor. Bu yüzden X-Forwarded-For zincirinin son (rightmost) elemanı
        # Cloudflare'in IP'si DEĞİL, Railway'in kendi internal proxy IP'si oluyor.
        # ProxyFix(x_for=1) bu son elemanı remote_addr yapıyor, dolayısıyla
        # _is_cloudflare_ip() gerçek Cloudflare trafiğinde bile hep False dönüyordu
        # ve TÜM istekler (meşru frontend istekleri dahil) 404 ile reddediliyordu.
        # Railway'in proxy derinliği garantili/sabit olmadığı için IP aralığına
        # güvenmek yerine, asıl güvenlik katmanı olarak Cloudflare'in enjekte ettiği
        # paylaşılan sır (ORIGIN_SECRET_VALUE + X-Origin-Verify header) kullanılıyor.
        # IP kontrolü artık sadece bilgilendirme/log amaçlı, isteği tek başına
        # reddetmiyor.
        if not self._is_cloudflare_ip(remote_ip):
            logger.debug(
                f"[ORIGIN-LOCK] Non-Cloudflare-range IP (bilgi amaçlı, engellenmedi): "
                f"{remote_ip} {_safe_log_url('https://api.zenithw.space' + request.path)}"
            )

        # CORS preflight (OPTIONS) isteklerinde tarayıcı custom header (X-Origin-Verify)
        # gönderemez, bu yüzden preflight'ı burada engellemiyoruz; flask-cors zaten
        # sadece ALLOWED_ORIGINS listesindeki origin'lere doğru CORS header'ları
        # döndürüyor. Asıl doğrulama gerçek istekte (POST/GET vb.) yapılıyor.
        if request.method == "OPTIONS":
            return None

        if self.runtime.config.ORIGIN_SECRET_VALUE:
            if not hmac.compare_digest(request.headers.get(self.runtime.config.ORIGIN_SECRET_HEADER, ""), self.runtime.config.ORIGIN_SECRET_VALUE):
                logger.warning(
                    "[ORIGIN-LOCK] Secret header missing/invalid: %s %s",
                    remote_ip,
                    _safe_log_url("https://api.zenithw.space" + request.path),
                )
                return jsonify({"error": "Not Found"}), 404
        elif not self.runtime.config.ORIGIN_LOCK_DEV_BYPASS:
            # Startup already rejects this state. Keep the request boundary
            # fail-closed as well in case configuration is changed unexpectedly.
            logger.error("[ORIGIN-LOCK] Missing ORIGIN_SECRET outside the development override")
            return jsonify({"error": "Not Found"}), 404

        return None

    def _limit_api_json_body(self):
        """Small control requests must never inherit the media-upload allowance."""
        if request.method == "POST" and request.path.rstrip("/") in self.runtime.config.API_JSON_PATHS:
            # Flask 3.1 also enforces this while reading chunked/unknown-length input.
            request.max_content_length = self.runtime.config.MAX_API_JSON_BYTES
            if request.content_length is not None and request.content_length > self.runtime.config.MAX_API_JSON_BYTES:
                return jsonify({"error": "Request body is too large", "error_code": "request_too_large"}), 413
        return None

    def _enforce_maintenance_mode(self):
        """Bakım sırasında yeni ve pahalı işleri durdur; mevcut dosya/cancel akışını koru."""
        if not self.runtime.config.MAINTENANCE_MODE or request.method == "OPTIONS":
            return None
        normalized_path = request.path.rstrip("/") or "/"
        if normalized_path not in self.runtime.config.MAINTENANCE_BLOCKED_PATHS:
            return None

        response = jsonify({
            "error": "ZenithW is temporarily unavailable during maintenance.",
            "error_code": "maintenance",
            "maintenance": True,
            "message": self.runtime.config.MAINTENANCE_MESSAGE,
            "until": self.runtime.config.MAINTENANCE_UNTIL or None,
            "retry_after": self.runtime.config.MAINTENANCE_RETRY_AFTER,
        })
        response.status_code = 503
        response.headers["Cache-Control"] = "no-store, max-age=0"
        response.headers["Retry-After"] = str(self.runtime.config.MAINTENANCE_RETRY_AFTER)
        return response

    def _limit_concurrent_requests_per_ip(self):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return None
        ip = self.get_client_ip()
        with self.concurrent_ip_lock:
            if self.concurrent_ip_counts[ip] >= self.runtime.config.MAX_CONCURRENT_PER_IP:
                return jsonify({"error": "Too many concurrent requests. Please wait."}), 429
            self.concurrent_ip_counts[ip] += 1
        g._concurrent_ip = ip

    def _release_concurrent_request_per_ip(self, exc=None):
        ip = getattr(g, "_concurrent_ip", None)
        if ip is not None:
            with self.concurrent_ip_lock:
                if ip in self.concurrent_ip_counts:
                    self.concurrent_ip_counts[ip] -= 1
                    if self.concurrent_ip_counts[ip] <= 0:
                        del self.concurrent_ip_counts[ip]

    def acquire_youtube_download_guard(self, ip, url):
        """Collapse double-click/replay bursts before they reach YouTube."""
        now = time.monotonic()
        key = (ip, hashlib.sha256(url.encode("utf-8")).digest())
        with self._youtube_download_guard_lock:
            stale = [item for item, state in self._youtube_download_guard.items()
                     if not state[0] and state[1] <= now]
            for item in stale:
                self._youtube_download_guard.pop(item, None)
            state = self._youtube_download_guard.get(key)
            if state is not None and (state[0] or state[1] > now):
                return None, max(1, math.ceil(state[1] - now)) if not state[0] else 5
            self._youtube_download_guard[key] = (True, 0)
        return key, 0

    def release_youtube_download_guard(self, key):
        if key is None:
            return
        with self._youtube_download_guard_lock:
            self._youtube_download_guard[key] = (
                False,
                time.monotonic() + self.runtime.config.YOUTUBE_REPEAT_COOLDOWN_SECONDS,
            )

    def consume_youtube_upstream_budget(self, ip, phase):
        """Limit actual AWS-to-YouTube work per visitor and for the whole host."""
        if phase == "metadata":
            ip_limiter, global_limiter = self.youtube_info_ip_limiter, self.youtube_info_global_limiter
        else:
            ip_limiter, global_limiter = self.youtube_download_ip_limiter, self.youtube_download_global_limiter
        if not ip_limiter.add(ip):
            return ip_limiter
        if not global_limiter.add("youtube"):
            return global_limiter
        return None

    def begin_youtube_download_request(self, ip, url):
        """Apply host-wide quota and duplicate suppression before reserving a job."""
        if not is_youtube(url):
            return None, None
        limited_by = self.consume_youtube_upstream_budget(ip, "download")
        if limited_by is not None:
            return None, rate_limit_response(
                limited_by,
                ip if limited_by is self.youtube_download_ip_limiter else "youtube",
                "YouTube downloads are being started too quickly. Please wait a moment.",
            )
        guard_key, retry_after = self.acquire_youtube_download_guard(ip, url)
        if guard_key is not None:
            return guard_key, None
        response = jsonify({
            "error": "This YouTube link is already active or was just attempted. Please wait briefly.",
            "error_code": "rate_limited",
        })
        response.status_code = 429
        response.headers["Retry-After"] = str(retry_after)
        response.headers["Cache-Control"] = "no-store, max-age=0"
        return None, response

    def periodic_rate_limiter_cleanup(self):
        """rate_limiter'ın O(n) global taramasını request path'inden ayırıp
        kendi periyodik thread'ine taşır (bkz. OPTIMIZATIONS.md Finding 2)."""
        while not self.runtime.stopping.wait(self.runtime.config.RATE_LIMIT_CLEANUP_INTERVAL):
            self.rate_limiter._cleanup_all()
            self.info_rate_limiter._cleanup_all()
            self.thumbnail_rate_limiter._cleanup_all()
            self.conversion_rate_limiter._cleanup_all()
            self.cancel_rate_limiter._cleanup_all()
            self.youtube_info_ip_limiter._cleanup_all()
            self.youtube_info_global_limiter._cleanup_all()
            self.youtube_download_ip_limiter._cleanup_all()
            self.youtube_download_global_limiter._cleanup_all()
