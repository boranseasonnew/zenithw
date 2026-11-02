"""Metadata extraction, bounded caching and request coalescing."""
import gevent
import logging
import os
import re
import threading
import time
from collections import OrderedDict
from flask import jsonify, request
from safe_ytdlp import SafeYoutubeDL
from zenith.security.errors import is_cookie_configuration_error, is_youtube_auth_required_error, public_error_payload, rate_limit_response, remember_primary_error, service_busy, youtube_app_required_response
from zenith.security.logging import _redact_log_text, _safe_log_url
from zenith.security.urls import is_instagram, is_unsupported_domain, is_youtube, is_youtube_live_url

logger = logging.getLogger("zenithw")

class MetadataService:
    def __init__(self, runtime):
        self.runtime = runtime
        self.info_cache_lock = threading.Lock()
        self.info_response_cache = OrderedDict()
        self.info_inflight = {}
        self.info_cache_hits = 0
        self.info_cache_misses = 0

    def _info_cache_key(self, url):
        """Keep cache entries separate when extraction access policy changes."""
        uses_cookie_file = os.path.isfile(self.runtime.config.COOKIES_FILE) and not is_instagram(url)
        return (url, uses_cookie_file, bool(self.runtime.config.POT_PROVIDER_URL))

    def _acquire_info_work(self, cache_key):
        """Return cached payload or elect exactly one extractor for this key."""
        pass  # Shared state is owned by this application runtime.
        now = time.monotonic()
        with self.info_cache_lock:
            cached = self.info_response_cache.get(cache_key)
            if cached is not None and now < cached[0]:
                self.info_response_cache.move_to_end(cache_key)
                self.info_cache_hits += 1
                return cached[1], None, False
            if cached is not None:
                self.info_response_cache.pop(cache_key, None)

            self.info_cache_misses += 1
            event = self.info_inflight.get(cache_key)
            if event is not None:
                return None, event, False
            event = threading.Event()
            self.info_inflight[cache_key] = event
            return None, event, True

    def _get_cached_info(self, cache_key):
        now = time.monotonic()
        with self.info_cache_lock:
            cached = self.info_response_cache.get(cache_key)
            if cached is None:
                return None
            if now >= cached[0]:
                self.info_response_cache.pop(cache_key, None)
                return None
            self.info_response_cache.move_to_end(cache_key)
            return cached[1]

    def _store_cached_info(self, cache_key, payload):
        with self.info_cache_lock:
            self.info_response_cache[cache_key] = (
                time.monotonic() + self.runtime.config.INFO_CACHE_TTL_SECONDS,
                payload,
            )
            self.info_response_cache.move_to_end(cache_key)
            while len(self.info_response_cache) > self.runtime.config.INFO_CACHE_MAX_SIZE:
                self.info_response_cache.popitem(last=False)

    def _finish_info_work(self, cache_key, event):
        with self.info_cache_lock:
            if self.info_inflight.get(cache_key) is event:
                self.info_inflight.pop(cache_key, None)
        event.set()

    def get_info(self):
        ip = self.runtime.security.get_client_ip()
        if not self.runtime.security.info_rate_limiter.add(ip):
            return rate_limit_response(self.runtime.security.info_rate_limiter, ip, "Too many metadata requests. Please wait a moment.")
        data = request.get_json(silent=True)
        if not isinstance(data, dict) or not isinstance(data.get("url", ""), str):
            return jsonify({"error": "Invalid request body"}), 400
        url = data.get("url", "").strip()
        if not url:
            return jsonify({"error": "URL required"}), 400
        if is_youtube(url) and not self.runtime.config.YOUTUBE_WEB_ENABLED:
            return youtube_app_required_response()
        if not self.runtime.network.is_safe_url(url):
            return jsonify({"error": "Invalid or disallowed URL."}), 400
        if is_youtube_live_url(url):
            return jsonify({"error": "Live streams are not currently supported."}), 400
        if is_unsupported_domain(url):
            return jsonify({"error": "This platform is not supported."}), 400

        cache_key = self._info_cache_key(url)
        cached_payload, inflight_event, is_leader = self._acquire_info_work(cache_key)
        if cached_payload is not None:
            return jsonify(cached_payload), 200

        if not is_leader:
            if not inflight_event.wait(self.runtime.config.INFO_TIMEOUT_SECONDS + 1):
                return service_busy("Metadata request is still running. Please try again shortly.", retry_after=2)
            cached_payload = self._get_cached_info(cache_key)
            if cached_payload is not None:
                return jsonify(cached_payload), 200
            return service_busy("Metadata lookup failed. Please try again shortly.", retry_after=2)

        slot_acquired = False
        try:
            if is_youtube(url):
                limited_by = self.runtime.security.consume_youtube_upstream_budget(ip, "metadata")
                if limited_by is not None:
                    return rate_limit_response(
                        limited_by,
                        ip if limited_by is self.runtime.security.youtube_info_ip_limiter else "youtube",
                        "YouTube metadata is being requested too quickly. Please wait a moment.",
                    )
            if not self.runtime.jobs.info_slots.acquire(blocking=False):
                return service_busy("Metadata service is busy. Please try again shortly.", retry_after=5)
            slot_acquired = True
            payload, status = self.get_info_with_slot(url)
            if status == 200:
                self._store_cached_info(cache_key, payload)
            return jsonify(payload), status
        finally:
            if slot_acquired:
                self.runtime.jobs.info_slots.release()
            self._finish_info_work(cache_key, inflight_event)

    def get_info_with_slot(self, url):
        extra_opts = {
            "extract_flat": "in_playlist",
            "playlistend": self.runtime.config.PLAYLIST_LIMIT,
        }
        if is_youtube(url):
            # /info only needs metadata (title, duration, thumbnail). yt-dlp may
            # otherwise reject the whole lookup while choosing a default format,
            # even though the metadata was extracted successfully. Actual format
            # availability and the PO-token-backed media request are still
            # validated by /download.
            extra_opts["ignore_no_formats_error"] = True
        opts_list = self.runtime.engine.get_opts_list(url, extra=extra_opts)
        last_err = None
        primary_err = None
        deadline = time.monotonic() + self.runtime.config.INFO_TIMEOUT_SECONDS
        for attempt_index, opts in enumerate(opts_list):
            try:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise TimeoutError("Metadata extraction timed out")
                with gevent.Timeout(remaining, TimeoutError("Metadata extraction timed out")):
                    with self.runtime.network._pot_provider_network_scope(url), self.runtime.engine.youtube_observation(url, opts, "metadata"):
                        with SafeYoutubeDL(opts) as ydl:
                            info = ydl.extract_info(url, download=False)
                    if info.get("_type") == "playlist" or "entries" in info:
                        entries = info.get("entries") or []
                        items = []
                        for e in entries:
                            if not e:
                                continue
                            entry_url = e.get("url") or e.get("webpage_url")
                            if not entry_url and e.get("id"):
                                if is_youtube(url):
                                    vid = e["id"]
                                    if isinstance(vid, str) and re.fullmatch(r"[A-Za-z0-9_-]{1,32}", vid):
                                        entry_url = f"https://www.youtube.com/watch?v={vid}"
                            if not entry_url:
                                continue
                            thumbs = e.get("thumbnails") or []
                            thumb = e.get("thumbnail") or (thumbs[-1].get("url") if thumbs else None)
                            items.append({
                                "url": entry_url,
                                "title": e.get("title") or "Video",
                                "duration": e.get("duration") or 0,
                                "thumbnail": thumb,
                            })
                        total_count = info.get("playlist_count") or len(items)
                        return {
                            "is_playlist": True,
                            "playlist_title": info.get("title") or "Playlist",
                            "playlist_count": len(items),
                            "total_entries": total_count,
                            "limited_to": self.runtime.config.PLAYLIST_LIMIT,
                            "items": items,
                            "platform": info.get("extractor_key", "").lower(),
                        }, 200
                    subs = info.get("subtitles") or {}
                    auto_subs = info.get("automatic_captions") or {}
                    sub_langs = sorted(set(subs.keys()) | set(auto_subs.keys()))
                    return {
                        "is_playlist": False,
                        "title": info.get("title") or "Video",
                        "duration": info.get("duration") or 0,
                        "thumbnail": info.get("thumbnail"),
                        "uploader": info.get("uploader") or info.get("channel") or "",
                        "platform": info.get("extractor_key", "").lower(),
                        "subtitles": sub_langs,
                        "has_manual_subtitles": bool(subs),
                    }, 200
            except TimeoutError as e:
                last_err = e
                primary_err = e
                break
            except Exception as e:
                last_err = e
                primary_err = remember_primary_error(primary_err, e)
                es = str(e).lower()
                if (opts.get("cookiefile") and is_cookie_configuration_error(es)
                        and attempt_index + 1 < len(opts_list)):
                    continue
                if "429" in es or "too many requests" in es:
                    # A second cookie-less attempt hits the same Railway egress IP
                    # immediately and only extends YouTube's upstream cooldown.
                    break
                auth_required = is_youtube_auth_required_error(es)
                future_cookie_profile = any(
                    candidate.get("cookiefile")
                    for candidate in opts_list[attempt_index + 1:]
                )
                if auth_required and not future_cookie_profile:
                    break
                if attempt_index + 1 < len(opts_list):
                    next_profile = opts_list[attempt_index + 1]
                    next_has_cookies = bool(next_profile.get("cookiefile"))
                    if next_has_cookies and not auth_required and not opts.get("cookiefile"):
                        # A cookie profile cannot repair an ordinary extraction
                        # failure and only repeats traffic from the same Railway IP.
                        break
                continue

        public_err = primary_err or last_err
        error_msg = str(public_err) if public_err else "Unknown error"
        logger.error(
            "[INFO ERR] %s: %s",
            _safe_log_url(url),
            _redact_log_text(error_msg)[:150],
        )
        if isinstance(last_err, TimeoutError):
            return {
                "error": "Metadata request timed out. Please try again.",
                "error_code": "request_timeout",
            }, 504
        payload = public_error_payload(error_msg, url)
        if payload["error_code"] == "instagram_ratelimit":
            payload["error"] = "instagram_ratelimit"  # Legacy frontend compatibility.
        return payload, 400
