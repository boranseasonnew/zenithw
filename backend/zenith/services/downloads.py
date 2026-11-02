"""Download attempts, progress and output finalization."""
import gevent
import logging
import os
import subprocess
import threading
import time
import uuid
import yt_dlp
from flask import jsonify, request
from safe_ytdlp import SafeYoutubeDL
from zenith.jobs.errors import DownloadQueueFull, DownloadQueueTimeout, DownloadRequestError, SpoolBudgetExceeded
from zenith.security.errors import is_cookie_configuration_error, is_youtube_auth_required_error, public_error_payload, rate_limit_response, remember_primary_error, service_busy, youtube_app_required_response
from zenith.security.logging import _redact_log_text
from zenith.security.urls import is_unsupported_domain, is_youtube, is_youtube_live_url
from zenith.services.formats import ALLOWED_DOWNLOAD_FORMATS, ALLOWED_SPONSORBLOCK_CATEGORIES, ALLOWED_VIDEO_CODECS, AUDIO_FMTS, FFMPEG_LOCAL_DEMUXERS, FFMPEG_LOCAL_PROTOCOLS
from zenith.services.validation import build_format_str, safe_download_name, sanitize_filename, selected_video_dimensions

logger = logging.getLogger("zenithw")

class DownloadAttemptResult:
    """Outcome of run_download_attempts(): which opts_list entry (if any)
    produced a finished file, plus enough error context for the route to
    build the right HTTP response. Deliberately a plain attribute bag, not
    a class hierarchy -- the route still owns all the response-building
    decisions, this just reports what happened.
    """
    __slots__ = (
        "success", "full_path", "video_title", "selected_width", "selected_height",
        "timed_out", "last_err", "primary_err",
    )

    def __init__(self, success=False, full_path=None, video_title=None,
                 timed_out=False, last_err=None, primary_err=None):
        self.success = success
        self.full_path = full_path
        self.video_title = video_title
        self.selected_width = None
        self.selected_height = None
        self.timed_out = timed_out
        self.last_err = last_err
        self.primary_err = primary_err

class DownloadService:
    def __init__(self, runtime):
        self.runtime = runtime

    def choose_youtube_adaptive_quality(self, url, quality, *, enabled, is_audio):
        """Protect YouTube throughput without changing any other platform's plan.

        The decision is intentionally made after a download slot is acquired, so
        the request sees the same queue state that will be used for extraction.
        An otherwise idle backend can use 1080p; concurrent or queued work stays
        at 720p to leave headroom for yt-dlp, merging, and retry fallbacks.
        """
        if is_audio or not is_youtube(url):
            return quality, "off"
        with self.runtime.jobs.queue_lock:
            low_traffic = self.runtime.jobs.active_downloads_count <= 1 and self.runtime.jobs.queue_waiting == 0
        cap = 1080 if low_traffic else 720
        try:
            requested = int(quality)
        except (TypeError, ValueError):
            requested = 1080
        effective = min(requested, cap) if requested != 9999 else cap
        # This is a server protection, not a client preference. Keep accepting the
        # legacy flag for API compatibility, but never let a caller disable the cap.
        return str(effective), "1080p-idle" if low_traffic else "720p-busy"

    def parse_download_request(self, data):
        """Validate and normalize the JSON contract before reserving job state."""
        if not isinstance(data, dict):
            raise DownloadRequestError("Invalid request body")

        raw_url = data.get("url", "")
        url = raw_url.strip() if isinstance(raw_url, str) else ""
        quality = str(data.get("quality", "1080"))
        raw_format = data.get("format", "mp4")
        raw_codec = data.get("codec", "h264")
        fmt = raw_format.lower() if isinstance(raw_format, str) else ""
        codec = raw_codec.lower() if isinstance(raw_codec, str) else ""
        audio_q = str(data.get("audioQ", "256"))
        youtube_adaptive_quality = data.get("youtube_adaptive_quality", True) is not False

        if fmt not in ALLOWED_DOWNLOAD_FORMATS:
            raise DownloadRequestError("Unsupported format")
        if codec not in ALLOWED_VIDEO_CODECS:
            raise DownloadRequestError("Unsupported codec")
        if not quality.isdigit() or not (1 <= len(quality) <= 4):
            raise DownloadRequestError("Invalid quality value")
        if not audio_q.isdigit():
            audio_q = "256"
        if not url:
            raise DownloadRequestError("URL required")
        if not self.runtime.network.is_safe_url(url):
            raise DownloadRequestError("Invalid or disallowed URL.")
        if is_youtube_live_url(url):
            raise DownloadRequestError("Live streams are not currently supported.")
        if is_unsupported_domain(url):
            raise DownloadRequestError("This platform is not supported.")

        sub_langs = data.get("sub_langs") or ["en"]
        if isinstance(sub_langs, str):
            sub_langs = [sub_langs]
        if not isinstance(sub_langs, list):
            sub_langs = ["en"]
        sub_langs = [
            lang for lang in sub_langs
            if isinstance(lang, str)
            and 1 <= len(lang) <= 10
            and all(char.isalnum() or char == "-" for char in lang)
        ][:5]

        sb_categories = data.get("sponsorblock_categories") or ["sponsor"]
        if not isinstance(sb_categories, list):
            sb_categories = ["sponsor"]
        sb_categories = [
            category for category in sb_categories
            if isinstance(category, str) and category in ALLOWED_SPONSORBLOCK_CATEGORIES
        ][:9] or ["sponsor"]
        sb_mode = data.get("sponsorblock_mode", "remove")
        if sb_mode not in ("remove", "mark"):
            sb_mode = "remove"

        is_audio = fmt in AUDIO_FMTS
        mute = bool(data.get("mute", False))
        youtube_video_only_mute = mute and not is_audio and is_youtube(url)
        mute_needs_strip = mute and not is_audio and not youtube_video_only_mute
        if mute_needs_strip and not self.runtime.engine.FFMPEG_DIR:
            raise DownloadRequestError("FFmpeg is required for mute downloads.")

        return {
            "url": url,
            "quality": quality,
            "format": fmt,
            "codec": codec,
            "audio_q": audio_q,
            "youtube_adaptive_quality": youtube_adaptive_quality,
            "sid": data.get("sid", ""),
            "requested_download_id": data.get("download_id"),
            "requested_download_name": data.get("download_name"),
            "add_meta": bool(data.get("metadata", True)),
            "mute": mute,
            "want_subs": bool(data.get("subtitles", False)),
            "sub_langs": sub_langs,
            "want_sponsorblock": bool(data.get("sponsorblock", False)),
            "sb_categories": sb_categories,
            "sb_mode": sb_mode,
            "is_audio": is_audio,
            "youtube_video_only_mute": youtube_video_only_mute,
            "mute_needs_strip": mute_needs_strip,
        }

    def make_download_progress_hook(self, sid, download_id, cancel_event, size_exceeded,
                                    spool_exceeded, dl_start_time, expected_max_height=None):
        """Create the throttled yt-dlp progress hook used by one download job."""
        last_progress = {"time": 0.0, "percent": None, "status": None}
        last_disk_check = {"time": 0.0}

        def emit_progress(payload, force=False):
            if not sid:
                return
            now = time.monotonic()
            percent = payload.get("percent")
            status = payload.get("status")
            same_value = percent == last_progress["percent"] and status == last_progress["status"]
            too_soon = now - last_progress["time"] < self.runtime.config.PROGRESS_EMIT_INTERVAL
            if not force and (same_value or too_soon):
                return
            last_progress.update(time=now, percent=percent, status=status)
            self.runtime.jobs.emit_job_progress(sid, download_id, payload)

        def progress_hook(data):
            if cancel_event.is_set():
                raise yt_dlp.utils.DownloadCancelled("Cancelled")
            if data["status"] == "downloading":
                now = time.monotonic()
                if now - last_disk_check["time"] >= 1:
                    last_disk_check["time"] = now
                    if not self.runtime.files.has_minimum_free_disk():
                        spool_exceeded["flag"] = True
                        cancel_event.set()
                        raise yt_dlp.utils.DownloadCancelled("Spool disk watermark reached")
                total = data.get("total_bytes") or data.get("total_bytes_estimate", 0)
                downloaded = data.get("downloaded_bytes", 0)
                if (total and total > self.runtime.config.MAX_DOWNLOAD_SIZE_BYTES) or downloaded > self.runtime.config.MAX_DOWNLOAD_SIZE_BYTES:
                    size_exceeded["flag"] = True
                    cancel_event.set()
                    if sid:
                        self.runtime.jobs.emit_job_progress(sid, download_id, {
                            "status": "error",
                            "message": f"File size limit exceeded (maximum {self.runtime.config.MAX_DOWNLOAD_SIZE_BYTES // (1024 * 1024)} MB).",
                        })
                    raise yt_dlp.utils.DownloadCancelled("Size limit exceeded")
                if total > 0:
                    percent = max(5, int(downloaded / total * 82))
                elif data.get("fragment_index") is not None and data.get("fragment_count"):
                    percent = max(5, int(data["fragment_index"] / data["fragment_count"] * 82))
                else:
                    percent = min(80, 5 + int(time.time() - dl_start_time) * 2)
                speed = data.get("_speed_str", "").strip()
                if "unknown" in speed.lower():
                    speed = ""
                width, height = selected_video_dimensions(data.get("info_dict"))
                progress_payload = {
                    "percent": percent,
                    "speed": speed,
                    "eta": data.get("_eta_str", "").strip(),
                    "downloaded_bytes": downloaded,
                    "total_bytes": total,
                    "status": "downloading",
                }
                if height:
                    progress_payload.update({
                        "actual_width": width,
                        "actual_height": height,
                        "quality_verified": not expected_max_height or height <= expected_max_height,
                    })
                emit_progress(progress_payload)
            elif data["status"] == "finished" and sid:
                emit_progress({"percent": 88, "status": "merging"}, force=True)

        return progress_hook

    def build_download_options(self, url, *, quality, fmt, codec, audio_q, mute, is_audio,
                               add_meta, want_sponsorblock, sb_categories, sb_mode,
                               want_subs, sub_langs, filepath, progress_hook):
        """Build yt-dlp options without mixing plan construction into the route."""
        fmt_str = build_format_str(url, quality, fmt, codec, mute=mute)
        if is_audio:
            codec_map = {
                "mp3": "mp3", "flac": "flac", "wav": "wav",
                "ogg": "vorbis", "opus": "opus", "m4a": "m4a",
            }
            preferred = codec_map.get(fmt, "mp3")
            # Opus accepts a target bitrate too.  Keep lossless targets untouched,
            # but honour the selected bitrate for the lossy audio formats.
            preferred_q = audio_q if fmt in ("mp3", "ogg", "m4a", "opus") else "0"
            postprocessors = [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": preferred,
                "preferredquality": preferred_q,
            }]
            extra = {
                "format": fmt_str,
                "outtmpl": filepath + ".%(ext)s",
                "progress_hooks": [progress_hook],
                "postprocessors": postprocessors,
            }
        else:
            merge_fmt = fmt if fmt in ("webm", "mkv", "avi", "mov") else "mp4"
            postprocessors = []
            extra = {
                "format": fmt_str,
                "outtmpl": filepath + ".%(ext)s",
                "progress_hooks": [progress_hook],
                "merge_output_format": merge_fmt,
            }

        if add_meta:
            postprocessors.append({"key": "FFmpegMetadata", "add_metadata": True})
        if want_sponsorblock:
            postprocessors.append({
                "key": "SponsorBlock",
                "categories": sb_categories,
                "api": "https://sponsor.ajay.app",
            })
            if sb_mode == "remove":
                postprocessors.append({
                    "key": "ModifyChapters",
                    "remove_sponsor_segments": sb_categories,
                })
        if not is_audio and want_subs and self.runtime.engine.FFMPEG_DIR:
            extra["writesubtitles"] = True
            extra["writeautomaticsub"] = True
            extra["subtitleslangs"] = sub_langs
            extra["subtitlesformat"] = "srt/best"
            postprocessors.append({"key": "FFmpegEmbedSubtitle"})
        if postprocessors:
            extra["postprocessors"] = postprocessors

        # Metadata and download stay in one extraction. noplaylist selects the
        # single video from video+playlist URLs; match_filter rejects containers.
        extra["noplaylist"] = True
        extra["match_filter"] = self.runtime.engine.enforce_download_limits
        return self.runtime.engine.get_opts_list(
            url,
            extra=extra,
            youtube_video_fallback=is_youtube(url) and not is_audio,
        )

    def run_download_attempts(self, url, opts_list, *, download_id, filename, video_title,
                               request_deadline, cancel_event):
        """Runs the yt-dlp extract_info(download=True) retry loop for /download.

        Tries each entry in opts_list in order (the client-fallback ladder built
        by get_opts_list), stopping at the first one that produces a finished
        media file. This is a line-for-line extraction of the previous inline
        loop (OPTIMIZATIONS.md Finding 11): same end-to-end deadline handling,
        same child-process reaping via _reap_new_children, same cookie/429/
        login/format fallback rules between attempts.

        yt_dlp.utils.DownloadCancelled and the process-fatal exceptions
        (MemoryError/SystemError/KeyboardInterrupt/SystemExit) are re-raised
        exactly as before so the route's existing except blocks keep handling
        them unchanged. Every other outcome -- success, timeout, or exhausted
        retries -- is reported back via the returned DownloadAttemptResult so
        the route stays the single place that turns outcomes into HTTP
        responses.
        """
        result = DownloadAttemptResult(video_title=video_title)
        primary_err = None
        last_err = None

        for attempt_index, opts in enumerate(opts_list):
            if cancel_event.is_set():
                break
            if is_youtube(url):
                youtube_args = opts.get("extractor_args", {}).get("youtube", {})
                player_clients = ",".join(youtube_args.get("player_client") or ()) or "auto"
                auth_profile = "cookies" if opts.get("cookiefile") else "cookieless"
                logger.info(
                    f"[DL] YouTube attempt {attempt_index + 1}/{len(opts_list)} "
                    f"client={player_clients} auth={auth_profile}"
                )
            before_pids = self.runtime.engine._snapshot_child_pids()
            try:
                # NOT: gevent.Timeout subprocess'leri (ffmpeg merge) durduramaz,
                # sadece Python kodunu kapsar. Bu yüzden timeout/exception
                # sonrası _reap_new_children ile process ağacı taranıp
                # timeout süresince doğan ffmpeg/aria2c process'leri öldürülür.
                # Ayrıca uzun süren işlemler için gunicorn --timeout (660s)
                # devreye girer ve worker'ı restart eder. Bu yüzden
                # DOWNLOAD_TIMEOUT_SECONDS < gunicorn timeout.
                remaining = request_deadline - time.monotonic()
                if remaining <= 0:
                    raise TimeoutError(f"{self.runtime.config.DOWNLOAD_TIMEOUT_SECONDS}s end-to-end deadline exceeded")
                with gevent.Timeout(remaining, TimeoutError(f"{self.runtime.config.DOWNLOAD_TIMEOUT_SECONDS}s end-to-end deadline exceeded")):
                    with self.runtime.network._pot_provider_network_scope(url), self.runtime.engine.youtube_observation(url, opts, "download"):
                        with SafeYoutubeDL(opts) as ydl:
                            download_info = ydl.extract_info(url, download=True)
                            if not isinstance(download_info, dict):
                                raise ValueError(
                                    "Playlist downloads are not supported. Select a single video."
                                )
                            if download_info.get("_type") in ("playlist", "multi_video") or "entries" in download_info:
                                raise ValueError(
                                    "Playlist downloads are not supported. Select a single video."
                                )
                            limit_error = self.runtime.engine.enforce_download_limits(download_info, incomplete=False)
                            if limit_error:
                                raise ValueError(limit_error)
                            full_path = self.runtime.files.resolve_downloaded_media_path(download_info, filename)
                            if not full_path:
                                raise FileNotFoundError("Downloaded media file path not found")
                            # A failed earlier client/profile can leave token-scoped
                            # .part, subtitle or separate stream files behind. Keep
                            # only the authoritative final path before the prepared
                            # file reservation takes ownership of it.
                            self.runtime.files.cleanup_download_artifacts(filename, keep_paths=(full_path,))
                            result.full_path = full_path
                            result.video_title = download_info.get("title") or result.video_title
                            result.selected_width, result.selected_height = selected_video_dimensions(download_info)
                            result.success = True
                            break
            except yt_dlp.utils.DownloadCancelled:
                self.runtime.engine._reap_new_children(before_pids, download_id, filename)
                self.runtime.files.cleanup_download_artifacts(filename)
                raise
            except TimeoutError as e:
                result.timed_out = True
                last_err = e
                primary_err = e
                logger.error(f"[DL TIMEOUT] {self.runtime.config.DOWNLOAD_TIMEOUT_SECONDS}s exceeded")
                self.runtime.engine._reap_new_children(before_pids, download_id, filename)
                self.runtime.files.cleanup_download_artifacts(filename)
                break
            except (MemoryError, SystemError, KeyboardInterrupt, SystemExit):
                self.runtime.engine._reap_new_children(before_pids, download_id, filename)
                self.runtime.files.cleanup_download_artifacts(filename)
                raise
            except Exception as e:
                last_err = e
                primary_err = remember_primary_error(primary_err, e)
                es = str(e).lower()
                logger.error("[DL FAIL] %s", _redact_log_text(es)[:100])
                self.runtime.engine._reap_new_children(before_pids, download_id, filename)
                self.runtime.files.cleanup_download_artifacts(filename)
                if (opts.get("cookiefile") and is_cookie_configuration_error(es)
                        and attempt_index + 1 < len(opts_list)):
                    continue
                if "429" in es or "too many requests" in es:
                    # Do not double-hit the same rate-limited YouTube endpoint
                    # with the immediate cookie-less fallback.
                    break
                auth_required = is_youtube_auth_required_error(es)
                future_cookie_profile = any(
                    candidate.get("cookiefile")
                    for candidate in opts_list[attempt_index + 1:]
                )
                if (auth_required and not future_cookie_profile) or (
                        "video too long" in es
                        or "playlist downloads are not supported" in es
                        or "downloaded media file path not found" in es):
                    break
                if attempt_index + 1 < len(opts_list):
                    next_youtube_args = (
                        opts_list[attempt_index + 1]
                        .get("extractor_args", {})
                        .get("youtube", {})
                    )
                    next_clients = next_youtube_args.get("player_client") or ()
                    next_is_video_fallback = list(next_clients) == ["default"]
                    next_has_cookies = bool(opts_list[attempt_index + 1].get("cookiefile"))
                    format_missing = any(token in es for token in (
                        "requested format", "no video formats", "only images",
                        "format is not available", "format unavailable",
                    ))
                    if (next_is_video_fallback and not format_missing
                            and not opts.get("cookiefile")
                            and not (auth_required and next_has_cookies)):
                        break
                continue

        result.last_err = last_err
        result.primary_err = primary_err
        return result

    def apply_mute_postprocessing(self, full_path):
        """Strips the audio track from an already-downloaded file via a second
        FFmpeg stream-copy pass (OPTIMIZATIONS.md Finding 11's media
        post-processing extraction).

        This is only a fallback path now: build_format_str's
        youtube_video_only_mute selection (Finding 2) avoids this entirely on
        YouTube by requesting a video-only format up front. Non-YouTube
        extractors that only expose muxed formats still land here.

        Mutates the file on disk in place -- the stripped copy is renamed over
        full_path -- and raises on any FFmpeg failure so the caller's existing
        error handling and artifact cleanup take over unchanged.
        """
        logger.info("[DL] mute step starting")
        base, ext = os.path.splitext(full_path)
        muted_path = base + ".muted" + ext
        self.runtime.files._register_cleanup(muted_path)
        try:
            ffmpeg_cmd = self.runtime.engine.FFMPEG_PATH or os.path.join(self.runtime.engine.FFMPEG_DIR, "ffmpeg")
            result = subprocess.run(
                [ffmpeg_cmd, "-y", "-protocol_whitelist", FFMPEG_LOCAL_PROTOCOLS, "-format_whitelist", FFMPEG_LOCAL_DEMUXERS,
                 "-i", full_path,
                 "-c", "copy", "-an", muted_path],
                capture_output=True, text=True, timeout=self.runtime.config.FFMPEG_TIMEOUT
            )
            if result.returncode == 0 and os.path.exists(muted_path):
                os.remove(full_path)
                self.runtime.files._unregister_cleanup(full_path)
                os.rename(muted_path, full_path)
                self.runtime.files._unregister_cleanup(muted_path)
                self.runtime.files._register_cleanup(full_path)
            else:
                logger.error("[MUTE FFMPEG FAIL] %s", _redact_log_text(result.stderr)[:200])
                raise RuntimeError("Mute processing failed")
        except Exception as e:
            logger.error("[MUTE FFMPEG ERR] %s", _redact_log_text(e))
            raise
        finally:
            try:
                if os.path.exists(muted_path):
                    os.remove(muted_path)
                    self.runtime.files._unregister_cleanup(muted_path)
            except Exception as exc:
                self.runtime.files._log_cleanup_failure("remove partial mute output", exc)

    def finalize_prepared_download(self, full_path, *, fmt, video_title, requested_download_name,
                                    ip, spool_reservation_id, sid, download_id, release_slot,
                                    state):
        """Idempotent job finalizer for a completed /download attempt
        (OPTIMIZATIONS.md Finding 11): validates the final size, emits the
        'done' progress event, hands the artifact off for native file transfer,
        and returns the Flask response.

        Repeated calls with the same state return the first result without issuing
        another token or releasing the slot again. `release_slot` is called at most
        once -- at the same point the processing slot was freed before this
        extraction, right after
        the size check and before native-transfer prep -- so the caller's own
        slot_acquired bookkeeping (and the route's `finally` fallback release)
        stays correct. Returns (response_tuple, reservation_consumed); the
        caller should clear its own spool_reservation_id bookkeeping when
        reservation_consumed is True, since ownership of that reservation has
        passed to the prepared-file lifecycle.
        """
        with state["lock"]:
            if state.get("completed"):
                return state["result"]

            try:
                final_size = os.path.getsize(full_path)
            except OSError:
                final_size = 0

            if final_size <= 0:
                try:
                    os.remove(full_path)
                    self.runtime.files._unregister_cleanup(full_path)
                except Exception as exc:
                    self.runtime.files._log_cleanup_failure("remove empty prepared download", exc)
                self.runtime.jobs.discard_cancel_event(download_id)
                if sid:
                    self.runtime.jobs.emit_job_progress(sid, download_id, {'status': 'error', 'error_code': 'request_failed'})
                state["result"] = ((
                    jsonify({
                        "error": "The prepared download is empty or could not be read.",
                        "error_code": "request_failed",
                    }),
                    500,
                ), False)
                state["completed"] = True
                return state["result"]

            if final_size > self.runtime.config.MAX_DOWNLOAD_SIZE_BYTES:
                try:
                    os.remove(full_path)
                    self.runtime.files._unregister_cleanup(full_path)
                except Exception as exc:
                    self.runtime.files._log_cleanup_failure("remove oversized prepared download", exc)
                self.runtime.jobs.discard_cancel_event(download_id)
                if sid:
                    self.runtime.jobs.emit_job_progress(sid, download_id, {'status': 'error', 'error_code': 'file_too_large'})
                max_mb = self.runtime.config.MAX_DOWNLOAD_SIZE_BYTES // (1024 * 1024)
                state["result"] = ((
                    jsonify({"error": f"File size limit exceeded (maximum {max_mb} MB).", "error_code": "file_too_large"}),
                    400,
                ), False)
                state["completed"] = True
                return state["result"]

            if not state.get("slot_released"):
                release_slot()
                state["slot_released"] = True

            ext = os.path.splitext(full_path)[1].lstrip('.') or fmt
            fallback_title = sanitize_filename(video_title) if video_title else "zenithw"
            download_name = safe_download_name(requested_download_name, fallback_title, ext)
            if "token" not in state:
                state["token"] = self.runtime.files.prepare_native_download(
                    full_path, download_name, ip, spool_reservation_id
                )
            token = state["token"]
            # "done" means that the client can actually start the handoff.  Emitting
            # it before native-download preparation made the UI show 100% while the
            # response/token preparation could still fail or remain pending.
            if sid and not state.get("done_emitted"):
                self.runtime.jobs.emit_job_progress(sid, download_id, {'percent': 100, 'status': 'done'})
                state["done_emitted"] = True
            if not state.get("cancel_discarded"):
                self.runtime.jobs.discard_cancel_event(download_id)
                state["cancel_discarded"] = True
            logger.info("[DL] ready for native transfer (%s bytes)", final_size)
            state["result"] = ((
                jsonify({
                    "ok": True,
                    "download_id": download_id,
                    "download_url": f"/files/{token}",
                    "transfer_status_url": f"/files/{token}/status",
                    "filename": download_name,
                    "size": final_size,
                    "expires_in": self.runtime.config.PREPARED_FILE_TTL,
                }),
                200,
            ), True)
            state["completed"] = True
            return state["result"]

    def download(self):
        ip = self.runtime.security.get_client_ip()
        if not self.runtime.security.check_rate_limit(ip):
            return rate_limit_response(self.runtime.security.rate_limiter, ip, "Too many download requests. Please wait a moment.")
        # NOT: cleanup_old_files() burada senkron çağrılmıyor artık -- zaten
        # periodic_cleanup() arka plan thread'i FILE_CLEANUP_INTERVAL'de bir
        # aynı işi yapıyor. Her /download isteğinde tüm DOWNLOAD_DIR'i
        # listeleyip stat'lamak gereksiz I/O + gecikme ekliyordu (bkz.
        # OPTIMIZATIONS.md Finding 3).
        try:
            dl_request = self.parse_download_request(request.get_json(silent=True))
        except DownloadRequestError as exc:
            return jsonify({"error": str(exc)}), 400

        url = dl_request["url"]
        if is_youtube(url) and not self.runtime.config.YOUTUBE_WEB_ENABLED:
            return youtube_app_required_response()
        quality = dl_request["quality"]
        fmt = dl_request["format"]
        codec = dl_request["codec"]
        audio_q = dl_request["audio_q"]
        youtube_adaptive_quality = dl_request["youtube_adaptive_quality"]
        sid = self.runtime.jobs.validate_sid(dl_request["sid"], ip)
        requested_download_id = dl_request["requested_download_id"]
        requested_download_name = dl_request["requested_download_name"]
        add_meta = dl_request["add_meta"]
        mute = dl_request["mute"]
        want_subs = dl_request["want_subs"]
        sub_langs = dl_request["sub_langs"]
        want_sponsorblock = dl_request["want_sponsorblock"]
        sb_categories = dl_request["sb_categories"]
        sb_mode = dl_request["sb_mode"]
        is_audio = dl_request["is_audio"]
        youtube_video_only_mute = dl_request["youtube_video_only_mute"]
        mute_needs_strip = dl_request["mute_needs_strip"]
        youtube_guard_key, youtube_guard_error = self.runtime.security.begin_youtube_download_request(ip, url)
        if youtube_guard_error is not None:
            return youtube_guard_error
        cancel_event = threading.Event()
        size_exceeded = {"flag": False}
        spool_exceeded = {"flag": False}
        try:
            download_id = self.runtime.jobs.reserve_download_id(requested_download_id, cancel_event, ip)
        except ValueError:
            self.runtime.security.release_youtube_download_guard(youtube_guard_key)
            return jsonify({"error": "Invalid download_id"}), 400
        if download_id is None:
            # Frontend 409'u kullanıcı iptali olarak özel ele alıyor; çakışmayı 400
            # döndürerek gerçek hata mesajının gösterilmesini sağla.
            self.runtime.security.release_youtube_download_guard(youtube_guard_key)
            return jsonify({"error": "download_id is already active"}), 400

        video_title = None
        filename = str(uuid.uuid4())
        filepath = os.path.join(self.runtime.config.DOWNLOAD_DIR, filename)
        full_path = None
        dl_start_time = time.time()
        request_deadline = time.monotonic() + self.runtime.config.DOWNLOAD_TIMEOUT_SECONDS
        spool_reservation_id = None
        finalization_state = {"lock": threading.Lock()}
        progress_hook = None

        slot_acquired = False
        try:
            self.runtime.jobs.acquire_download_slot(sid, cancel_event, download_id)
            slot_acquired = True
            quality, youtube_quality_policy = self.choose_youtube_adaptive_quality(
                url,
                quality,
                enabled=youtube_adaptive_quality,
                is_audio=is_audio,
            )
            progress_hook = self.make_download_progress_hook(
                sid,
                download_id,
                cancel_event,
                size_exceeded,
                spool_exceeded,
                dl_start_time,
                expected_max_height=int(quality) if is_youtube(url) and not is_audio else None,
            )

            reservation_bytes = self.runtime.config.DOWNLOAD_SPOOL_RESERVATION_BYTES
            if mute_needs_strip:
                reservation_bytes = min(
                    self.runtime.config.MAX_SPOOL_SIZE_BYTES,
                    reservation_bytes + self.runtime.config.MAX_DOWNLOAD_SIZE_BYTES,
                )
            spool_reservation_id = self.runtime.files.reserve_spool(reservation_bytes, "download")
            if not spool_reservation_id:
                raise SpoolBudgetExceeded("Download spool capacity is full")

            logger.info(
                f"[DL] q={quality} youtube_policy={youtube_quality_policy} fmt={fmt} codec={codec} audio={is_audio} "
                f"mute_plan={'video-only' if youtube_video_only_mute else 'strip' if mute_needs_strip else 'none'}"
            )

            if is_audio and not self.runtime.engine.FFMPEG_DIR:
                self.runtime.jobs.discard_cancel_event(download_id)
                return jsonify({"error": "FFmpeg is required for audio conversion."}), 400
            opts_list = self.build_download_options(
                url,
                quality=quality,
                fmt=fmt,
                codec=codec,
                audio_q=audio_q,
                mute=mute,
                is_audio=is_audio,
                add_meta=add_meta,
                want_sponsorblock=want_sponsorblock,
                sb_categories=sb_categories,
                sb_mode=sb_mode,
                want_subs=want_subs,
                sub_langs=sub_langs,
                filepath=filepath,
                progress_hook=progress_hook,
            )
            logger.info(f"[DL] starting download (timeout={self.runtime.config.DOWNLOAD_TIMEOUT_SECONDS}s)")
            attempt_result = self.run_download_attempts(
                url, opts_list,
                download_id=download_id,
                filename=filename,
                video_title=video_title,
                request_deadline=request_deadline,
                cancel_event=cancel_event,
            )
            success = attempt_result.success
            full_path = attempt_result.full_path
            video_title = attempt_result.video_title
            selected_width = attempt_result.selected_width
            selected_height = attempt_result.selected_height
            timed_out = attempt_result.timed_out
            last_err = attempt_result.last_err
            primary_err = attempt_result.primary_err

            if cancel_event.is_set():
                raise yt_dlp.utils.DownloadCancelled("Cancelled")

            if timed_out:
                self.runtime.jobs.discard_cancel_event(download_id)
                self.runtime.files.cleanup_download_artifacts(filename)
                if sid:
                    self.runtime.jobs.emit_job_progress(sid, download_id, {'status': 'error', 'error_code': 'request_timeout'})
                return jsonify({"error": "The download took too long. Please try again.", "error_code": "request_timeout"}), 504

            if not success:
                raise primary_err or last_err or Exception("All attempts failed")

            if is_youtube(url) and not is_audio and selected_height:
                if selected_height > int(quality):
                    raise ValueError(
                        f"Selected media exceeded the server quality cap ({selected_height}p > {quality}p)"
                    )
                logger.info(
                    "[DL] YouTube selected resolution verified: %sx%sp (cap=%sp)",
                    selected_width or "?", selected_height, quality,
                )

            logger.info("[DL] download completed, processing file...")

            if not full_path:
                self.runtime.jobs.discard_cancel_event(download_id)
                return jsonify({"error": "File not found"}), 500

            # YENİ: Kesin temizlik için register et
            self.runtime.files._register_cleanup(full_path)

            if mute_needs_strip:
                self.apply_mute_postprocessing(full_path)

            def _release_download_slot_once():
                nonlocal slot_acquired
                if slot_acquired:
                    self.runtime.jobs._release_download_slot()
                    slot_acquired = False

            response, reservation_consumed = self.finalize_prepared_download(
                full_path,
                fmt=fmt,
                video_title=video_title,
                requested_download_name=requested_download_name,
                ip=ip,
                spool_reservation_id=spool_reservation_id,
                sid=sid,
                download_id=download_id,
                release_slot=_release_download_slot_once,
                state=finalization_state,
            )
            if reservation_consumed:
                spool_reservation_id = None
            return response

        except DownloadQueueFull:
            self.runtime.jobs.discard_cancel_event(download_id)
            if sid:
                self.runtime.jobs.emit_job_progress(sid, download_id, {'status': 'error', 'error_code': 'server_busy'})
            return service_busy("Download queue is full. Please try again shortly.", retry_after=10)
        except DownloadQueueTimeout:
            self.runtime.jobs.discard_cancel_event(download_id)
            if sid:
                self.runtime.jobs.emit_job_progress(sid, download_id, {'status': 'error', 'error_code': 'server_busy'})
            return service_busy("Download queue wait timed out. Please try again.", retry_after=10)
        except SpoolBudgetExceeded:
            self.runtime.jobs.discard_cancel_event(download_id)
            if full_path:
                self.runtime.files._force_cleanup(full_path)
            if sid:
                self.runtime.jobs.emit_job_progress(sid, download_id, {'status': 'error', 'error_code': 'server_busy'})
            return service_busy(
                "Temporary file capacity is full. Please try again after active transfers finish.",
                retry_after=10,
            )
        except yt_dlp.utils.DownloadCancelled:
            self.runtime.files.cleanup_download_artifacts(filename)
            self.runtime.jobs.discard_cancel_event(download_id)
            if spool_exceeded["flag"]:
                if sid:
                    self.runtime.jobs.emit_job_progress(sid, download_id, {'status': 'error', 'error_code': 'server_busy'})
                return service_busy(
                    "Temporary disk capacity is low. Please try again later.",
                    retry_after=15,
                )
            if size_exceeded["flag"]:
                max_mb = self.runtime.config.MAX_DOWNLOAD_SIZE_BYTES // (1024 * 1024)
                if sid:
                    self.runtime.jobs.emit_job_progress(sid, download_id, {'status': 'error', 'error_code': 'file_too_large'})
                return jsonify({"error": f"File size limit exceeded (maximum {max_mb} MB).", "error_code": "file_too_large"}), 400
            if sid:
                self.runtime.jobs.emit_job_progress(sid, download_id, {'percent': 0, 'status': 'cancelled'})
            return jsonify({"error": "cancelled"}), 409
        except Exception as e:
            error_msg = str(e)
            logger.error("[DL ERR] %s", _redact_log_text(error_msg)[:200])
            self.runtime.jobs.discard_cancel_event(download_id)
            self.runtime.files.cleanup_download_artifacts(filename)
            payload = public_error_payload(error_msg, url)
            if sid:
                self.runtime.jobs.emit_job_progress(sid, download_id, {'status': 'error', 'error_code': payload['error_code']})
            if payload["error_code"] == "instagram_ratelimit":
                payload["error"] = "instagram_ratelimit"  # Legacy frontend compatibility.
            return jsonify(payload), 400
        finally:
            if spool_reservation_id:
                self.runtime.files.release_spool(spool_reservation_id)
                spool_reservation_id = None
            if slot_acquired:
                self.runtime.jobs._release_download_slot()
                slot_acquired = False
            self.runtime.security.release_youtube_download_guard(youtube_guard_key)
