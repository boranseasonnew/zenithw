"""Bounded thumbnail requests and extraction."""
import gevent
import logging
import os
import time
import uuid
from flask import jsonify, request, send_file
from safe_ytdlp import SafeYoutubeDL
from urllib.request import Request as UrlRequest
from zenith.security.errors import is_youtube_auth_required_error, public_error_payload, rate_limit_response, remember_primary_error, service_busy, youtube_app_required_response
from zenith.security.logging import _redact_log_text
from zenith.security.network import open_http_resource
from zenith.security.urls import is_unsupported_domain, is_youtube, is_youtube_live_url

logger = logging.getLogger("zenithw")

class ThumbnailService:
    def __init__(self, runtime):
        self.runtime = runtime

    def download_thumbnail(self):
        ip = self.runtime.security.get_client_ip()
        if not self.runtime.security.thumbnail_rate_limiter.add(ip):
            return rate_limit_response(self.runtime.security.thumbnail_rate_limiter, ip, "Too many thumbnail requests. Please wait a moment.")
        data = request.get_json(silent=True)
        if not isinstance(data, dict) or not isinstance(data.get("url", ""), str):
            return jsonify({"error": "Invalid request body"}), 400
        url = data.get("url", "").strip()
        raw_thumbnail = data.get("thumbnail_url", "")
        if not isinstance(raw_thumbnail, str):
            return jsonify({"error": "Invalid thumbnail URL"}), 400
        thumbnail_url = raw_thumbnail.strip()
        if not url:
            return jsonify({"error": "URL required"}), 400
        if is_youtube(url) and not self.runtime.config.YOUTUBE_WEB_ENABLED:
            return youtube_app_required_response()
        if not self.runtime.jobs.thumbnail_slots.acquire(blocking=False):
            return service_busy("Thumbnail service is busy. Please try again shortly.", retry_after=5)
        try:
            if not self.runtime.network.is_safe_url(url):
                return jsonify({"error": "Invalid or disallowed URL."}), 400
            if is_youtube_live_url(url):
                return jsonify({"error": "Live streams are not currently supported."}), 400
            if is_unsupported_domain(url):
                return jsonify({"error": "This platform is not supported."}), 400
            # The analysis response already carries an extractor-provided image URL.
            # Prefer it: fetching this small static asset should not require a second
            # metadata extraction (which video platforms increasingly block on cloud
            # IPs). The same SSRF guard protects this public URL as every other
            # outbound request.
            if thumbnail_url:
                if not self.runtime.network.is_safe_url(thumbnail_url):
                    return jsonify({"error": "Invalid thumbnail URL."}), 400
                return self.download_thumbnail_from_url(thumbnail_url)
            if not self.runtime.engine.FFMPEG_DIR:
                return jsonify({"error": "FFmpeg required"}), 400
            return self.download_thumbnail_with_slot(url)
        finally:
            self.runtime.jobs.thumbnail_slots.release()

    def download_thumbnail_from_url(self, thumbnail_url):
        """Download an already-extracted public thumbnail with bounded streaming.

        This deliberately accepts only image responses and writes to the existing
        per-request download workspace, so the normal delayed cleanup path and the
        systemd writable-directory boundary remain intact.
        """
        filename = str(uuid.uuid4())
        content_type = ""
        deadline = time.monotonic() + self.runtime.config.THUMBNAIL_TIMEOUT_SECONDS
        try:
            request_obj = UrlRequest(
                thumbnail_url,
                headers={"User-Agent": "ZenithW/1.0 (thumbnail fetch)"},
            )
            with gevent.Timeout(self.runtime.config.THUMBNAIL_TIMEOUT_SECONDS, TimeoutError("Thumbnail request timed out")), open_http_resource(request_obj, timeout=min(self.runtime.config.THUMBNAIL_TIMEOUT_SECONDS, 20)) as upstream:
                content_type = (upstream.headers.get_content_type() or "").lower()
                if not content_type.startswith("image/"):
                    raise ValueError("Thumbnail source did not return an image")
                subtype = content_type.split("/", 1)[1].split(";", 1)[0]
                extension = {"jpeg": "jpg", "jpg": "jpg", "png": "png", "webp": "webp", "gif": "gif"}.get(subtype)
                if not extension:
                    raise ValueError("Thumbnail image format is not supported")
                full_path = os.path.join(self.runtime.config.DOWNLOAD_DIR, f"{filename}.{extension}")
                total = 0
                with open(full_path, "wb") as output:
                    while True:
                        if time.monotonic() >= deadline:
                            raise TimeoutError("Thumbnail request timed out")
                        chunk = upstream.read(64 * 1024)
                        if not chunk:
                            break
                        total += len(chunk)
                        if total > self.runtime.config.MAX_THUMBNAIL_BYTES:
                            raise ValueError("Thumbnail image is too large")
                        output.write(chunk)
            if not total:
                raise ValueError("Thumbnail image was empty")
            self.runtime.files._register_cleanup(full_path)
            response = send_file(full_path, as_attachment=True, download_name=f"thumbnail.{extension}")
            response.direct_passthrough = False

            @response.call_on_close
            def _cleanup_direct_thumb():
                self.runtime.files._force_cleanup(full_path)

            return response
        except Exception as exc:
            if 'full_path' in locals():
                self.runtime.files._force_cleanup(full_path)
            logger.error("[THUMB DIRECT ERR] %s", _redact_log_text(str(exc))[:150])
            return jsonify(public_error_payload(str(exc), thumbnail_url)), 400

    def download_thumbnail_with_slot(self, url):
        filename = str(uuid.uuid4())
        filepath = os.path.join(self.runtime.config.DOWNLOAD_DIR, filename)
        extra = {
            "skip_download": True,
            "writethumbnail": True,
            "outtmpl": filepath + ".%(ext)s",
            "postprocessors": [
                {"key": "FFmpegThumbnailsConvertor", "format": "jpg"},
            ],
        }
        opts_list = self.runtime.engine.get_opts_list(
            url,
            extra=extra,
            # /download ile aynı sınırlı istemci zincirini kullan.
            youtube_video_fallback=is_youtube(url),
        )
        last_err = None
        primary_err = None
        deadline = time.monotonic() + self.runtime.config.THUMBNAIL_TIMEOUT_SECONDS
        for attempt_index, opts in enumerate(opts_list):
            before_pids = self.runtime.engine._snapshot_child_pids()
            try:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise TimeoutError("Thumbnail request timed out")
                with gevent.Timeout(remaining, TimeoutError("Thumbnail request timed out")):
                    with self.runtime.network._pot_provider_network_scope(url), self.runtime.engine.youtube_observation(url, opts, "thumbnail"):
                        with SafeYoutubeDL(opts) as ydl:
                            info = ydl.extract_info(url, download=True)
                    full_path = self.runtime.files.resolve_downloaded_thumbnail_path(info, filename)
                    if not full_path:
                        self.runtime.files.cleanup_download_artifacts(filename)
                        continue
                    # A failed earlier profile, or yt-dlp's thumbnail converter,
                    # can leave source/partial images beside the final JPG. Keep
                    # only the file that will be streamed so repeated thumbnail
                    # requests cannot slowly fill the EC2 spool directory.
                    self.runtime.files.cleanup_download_artifacts(filename, keep_paths=(full_path,))
                    self.runtime.files._register_cleanup(full_path)
                    response = send_file(full_path, as_attachment=True, download_name="thumbnail.jpg")
                    # Ensure the registered cleanup callback runs after send_file's
                    # direct-passthrough iterable is consumed.
                    response.direct_passthrough = False

                    @response.call_on_close
                    def _cleanup_thumb():
                        self.runtime.files._force_cleanup(full_path)

                    return response
            except TimeoutError as e:
                last_err = e
                primary_err = e
                self.runtime.engine._reap_new_children(before_pids, "thumbnail", filename)
                self.runtime.files.cleanup_download_artifacts(filename)
                break
            except Exception as e:
                last_err = e
                primary_err = remember_primary_error(primary_err, e)
                self.runtime.engine._reap_new_children(before_pids, "thumbnail", filename)
                self.runtime.files.cleanup_download_artifacts(filename)
                es = str(e).lower()
                if "429" in es or "too many requests" in es:
                    break
                auth_required = is_youtube_auth_required_error(es)
                future_cookie_profile = any(
                    candidate.get("cookiefile")
                    for candidate in opts_list[attempt_index + 1:]
                )
                if auth_required and not future_cookie_profile:
                    break
                if attempt_index + 1 < len(opts_list):
                    next_has_cookies = bool(opts_list[attempt_index + 1].get("cookiefile"))
                    if next_has_cookies and not auth_required and not opts.get("cookiefile"):
                        break
                continue

        self.runtime.files.cleanup_download_artifacts(filename)
        public_err = primary_err or last_err
        error_msg = str(public_err) if public_err else "Thumbnail could not be retrieved"
        logger.error("[THUMB ERR] %s", _redact_log_text(error_msg)[:150])
        if isinstance(last_err, TimeoutError):
            return jsonify({"error": "Thumbnail request timed out. Please try again.", "error_code": "request_timeout"}), 504
        return jsonify(public_error_payload(error_msg, url)), 400
