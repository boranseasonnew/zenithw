"""Validated remux and conversion execution."""
import logging
import os
import subprocess
import tempfile
from flask import jsonify, request
from zenith.jobs.errors import SpoolBudgetExceeded
from zenith.security.errors import rate_limit_response, service_busy
from zenith.security.logging import _redact_log_text
from zenith.services.formats import ALLOWED_CONVERT_FORMATS, ALLOWED_CONVERT_MODES, FFMPEG_LOCAL_DEMUXERS, FFMPEG_LOCAL_PROTOCOLS
from zenith.services.validation import safe_download_name, safe_input_suffix

logger = logging.getLogger("zenithw")

class ConversionService:
    def __init__(self, runtime):
        self.runtime = runtime

    def convert_file(self):
        ip = self.runtime.security.get_client_ip()
        if not self.runtime.security.check_rate_limit(ip):
            return rate_limit_response(self.runtime.security.rate_limiter, ip, "Too many conversion requests. Please wait a moment.")
        if not self.runtime.security.conversion_rate_limiter.add(ip):
            return rate_limit_response(
                self.runtime.security.conversion_rate_limiter,
                ip,
                "Conversion quota exceeded. Please try again later.",
            )
        # Slot, request.files multipart gövdesini parse edip diske almadan önce
        # ayrılır; dolu sunucu maksimum boyuta kadar gereksiz upload kabul etmez.
        if not self.runtime.jobs.conversion_slots.acquire(blocking=False):
            return service_busy("Server is busy with another conversion. Please try again shortly.", retry_after=10)
        spool_reservation = {"id": None}
        try:
            spool_reservation["id"] = self.runtime.files.reserve_spool(
                self.runtime.config.CONVERT_SPOOL_RESERVATION_BYTES,
                "conversion",
            )
            if not spool_reservation["id"]:
                return service_busy(
                    "Temporary file capacity is full. Please try again after active transfers finish.",
                    retry_after=10,
                )
            return self.convert_file_with_slot(ip, spool_reservation)
        finally:
            if spool_reservation["id"]:
                self.runtime.files.release_spool(spool_reservation["id"])
            self.runtime.jobs.conversion_slots.release()

    def convert_file_with_slot(self, ip, spool_reservation):
        if 'file' not in request.files:
            return jsonify({"error": "File required"}), 400
        file = request.files['file']
        target_format = request.form.get('target_format', 'mp3').lower()
        conversion_mode = request.form.get('mode', 'auto').lower()
        requested_download_name = request.form.get('download_name')
        if not file or file.filename == '':
            return jsonify({"error": "Invalid file"}), 400
        if target_format not in ALLOWED_CONVERT_FORMATS:
            return jsonify({"error": "Unsupported target format"}), 400
        if conversion_mode not in ALLOWED_CONVERT_MODES:
            return jsonify({"error": "Unsupported conversion mode"}), 400
        if not self.runtime.engine.FFMPEG_DIR:
            return jsonify({"error": "FFmpeg required"}), 400

        input_path = None
        output_path = None
        try:
            suffix = safe_input_suffix(file.filename)
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir=self.runtime.config.DOWNLOAD_DIR) as input_temp:
                input_path = input_temp.name
                file.save(input_path)
                self.runtime.files._register_cleanup(input_path)

            try:
                input_size = os.path.getsize(input_path)
            except OSError:
                input_size = 0
            if input_size <= 0:
                self.runtime.files._force_cleanup(input_path)
                return jsonify({
                    "error": "The uploaded file is empty or could not be read.",
                    "error_code": "invalid_file",
                }), 400

            input_duration = self.runtime.engine.probe_media_duration(input_path)
            if input_duration is None:
                self.runtime.files._force_cleanup(input_path)
                return jsonify({
                    "error": "The uploaded media duration could not be validated.",
                    "error_code": "media_probe_failed",
                }), 400
            if input_duration > self.runtime.config.MAX_VIDEO_DURATION_SECONDS:
                self.runtime.files._force_cleanup(input_path)
                max_min = self.runtime.config.MAX_VIDEO_DURATION_SECONDS // 60
                return jsonify({
                    "error": f"The uploaded media exceeds the {max_min}-minute limit.",
                    "error_code": "video_too_long",
                }), 400

            base_no_ext = os.path.splitext(os.path.basename(input_path))[0]
            output_path = os.path.join(
                os.path.dirname(input_path),
                base_no_ext + '.output.' + target_format,
            )
            self.runtime.files._register_cleanup(output_path)

            ffmpeg_cmd = self.runtime.engine.FFMPEG_PATH or os.path.join(self.runtime.engine.FFMPEG_DIR, "ffmpeg")
            base_cmd = [
                ffmpeg_cmd,
                '-hide_banner', '-loglevel', 'fatal', '-nostdin',
                '-protocol_whitelist', FFMPEG_LOCAL_PROTOCOLS,
                        '-format_whitelist', FFMPEG_LOCAL_DEMUXERS,
                '-probesize', '10M', '-analyzeduration', '10M',
                '-i', input_path, '-y', '-threads', str(self.runtime.config.FFMPEG_THREADS),
            ]

            audio_formats = {'mp3', 'm4a', 'aac', 'opus', 'ogg', 'flac', 'wav', 'aiff', 'wma'}
            copy_args = (
                ['-map', '0:a:0', '-vn', '-c:a', 'copy']
                if target_format in audio_formats
                else ['-map', '0', '-map_metadata', '0', '-c', 'copy']
            )

            completed_mode = None
            result = None
            if conversion_mode in {'auto', 'remux'}:
                copy_cmd = base_cmd + copy_args + [output_path]
                result, output_limit_exceeded = self.runtime.engine.run_ffmpeg_with_output_limit(
                    copy_cmd, output_path,
                )
                if output_limit_exceeded:
                    self.runtime.files._force_cleanup(output_path)
                    max_mb = self.runtime.config.MAX_CONVERT_OUTPUT_SIZE_BYTES // (1024 * 1024)
                    return jsonify({
                        "error": f"Converted file exceeds the {max_mb} MB limit.",
                        "error_code": "file_too_large",
                    }), 413
                if result.returncode == 0 and os.path.isfile(output_path):
                    completed_mode = 'remux'
                elif conversion_mode == 'remux':
                    logger.info("[REMUX INCOMPATIBLE] %s", _redact_log_text(result.stderr)[:300])
                    self.runtime.files._force_cleanup(output_path)
                    return jsonify({
                        "error": "The streams are not compatible with this container.",
                        "error_code": "remux_incompatible",
                    }), 400
                else:
                    logger.info(
                        "[CONV] stream copy incompatible; transcoding: %s",
                        _redact_log_text(result.stderr)[:200],
                    )
                    self.runtime.files._force_cleanup(output_path)
                    self.runtime.files._register_cleanup(output_path)

            if completed_mode is None:
                if input_duration > self.runtime.config.MAX_TRANSCODE_DURATION_SECONDS:
                    self.runtime.files._force_cleanup(output_path)
                    max_min = self.runtime.config.MAX_TRANSCODE_DURATION_SECONDS // 60
                    return jsonify({
                        "error": f"Transcoding is limited to {max_min} minutes on this service.",
                        "error_code": "conversion_too_long",
                    }), 400
                transcode_args = []
                if target_format in audio_formats:
                    transcode_args.extend(['-vn'])

                if target_format == 'mp3':
                    transcode_args.extend(['-codec:a', 'libmp3lame', '-q:a', '2'])
                elif target_format == 'aac':
                    transcode_args.extend(['-codec:a', 'aac', '-b:a', '192k'])
                elif target_format == 'flac':
                    transcode_args.extend(['-codec:a', 'flac'])
                elif target_format == 'wav':
                    transcode_args.extend(['-codec:a', 'pcm_s16le'])
                elif target_format == 'aiff':
                    transcode_args.extend(['-codec:a', 'pcm_s16be'])
                elif target_format == 'ogg':
                    transcode_args.extend(['-codec:a', 'libvorbis', '-q:a', '5'])
                elif target_format == 'opus':
                    transcode_args.extend(['-codec:a', 'libopus', '-b:a', '128k'])
                elif target_format == 'm4a':
                    transcode_args.extend(['-codec:a', 'aac', '-b:a', '192k'])
                elif target_format == 'wma':
                    transcode_args.extend(['-codec:a', 'wmav2', '-b:a', '192k'])
                elif target_format == 'mp4':
                    transcode_args.extend(['-c:v', 'libx264', '-c:a', 'aac'])
                elif target_format == 'webm':
                    transcode_args.extend(['-c:v', 'libvpx-vp9', '-c:a', 'libopus'])
                elif target_format == 'mkv':
                    transcode_args.extend(['-c:v', 'libx264', '-c:a', 'aac'])
                elif target_format == 'avi':
                    transcode_args.extend(['-c:v', 'libx264', '-c:a', 'mp3'])
                elif target_format == 'mov':
                    transcode_args.extend(['-c:v', 'libx264', '-c:a', 'aac'])
                elif target_format == 'm4v':
                    transcode_args.extend(['-c:v', 'libx264', '-c:a', 'aac'])
                elif target_format == '3gp':
                    transcode_args.extend(['-c:v', 'libx264', '-c:a', 'aac', '-f', '3gp'])
                elif target_format == 'ts':
                    transcode_args.extend(['-c:v', 'libx264', '-c:a', 'aac', '-f', 'mpegts'])
                elif target_format == 'wmv':
                    transcode_args.extend(['-c:v', 'wmv2', '-c:a', 'wmav2'])

                transcode_cmd = base_cmd + transcode_args + [output_path]
                result, output_limit_exceeded = self.runtime.engine.run_ffmpeg_with_output_limit(
                    transcode_cmd, output_path,
                )
                if output_limit_exceeded:
                    self.runtime.files._force_cleanup(output_path)
                    max_mb = self.runtime.config.MAX_CONVERT_OUTPUT_SIZE_BYTES // (1024 * 1024)
                    return jsonify({
                        "error": f"Converted file exceeds the {max_mb} MB limit.",
                        "error_code": "file_too_large",
                    }), 413
                if result.returncode != 0:
                    logger.error(
                        "[CONV FFMPEG ERR] %s",
                        _redact_log_text(result.stderr)[:300],
                    )
                    self.runtime.files._force_cleanup(output_path)
                    return jsonify({
                        "error": "Conversion failed. Please check the file format.",
                        "error_code": "conversion_failed",
                    }), 400
                completed_mode = 'transcode'

            try:
                output_size = os.path.getsize(output_path)
            except OSError:
                output_size = 0
            if output_size <= 0:
                self.runtime.files._force_cleanup(output_path)
                return jsonify({
                    "error": "Conversion did not produce a valid output file.",
                    "error_code": "conversion_failed",
                }), 400
            if output_size >= self.runtime.config.MAX_CONVERT_OUTPUT_SIZE_BYTES:
                self.runtime.files._force_cleanup(output_path)
                max_mb = self.runtime.config.MAX_CONVERT_OUTPUT_SIZE_BYTES // (1024 * 1024)
                return jsonify({
                    "error": f"Converted file exceeds the {max_mb} MB limit.",
                    "error_code": "file_too_large",
                }), 413

            try:
                if input_path and os.path.exists(input_path):
                    os.unlink(input_path)
                    self.runtime.files._unregister_cleanup(input_path)
            except Exception as exc:
                self.runtime.files._log_cleanup_failure("remove conversion input", exc)

            download_name = safe_download_name(requested_download_name, "converted", target_format)
            token = self.runtime.files.prepare_native_download(
                output_path,
                download_name,
                ip,
                spool_reservation["id"],
            )
            spool_reservation["id"] = None
            return jsonify({
                "ok": True,
                "download_url": f"/files/{token}",
                "transfer_status_url": f"/files/{token}/status",
                "filename": download_name,
                "size": output_size,
                "expires_in": self.runtime.config.PREPARED_FILE_TTL,
                "processing_mode": completed_mode,
            }), 200

        except SpoolBudgetExceeded:
            logger.warning("[CONV] prepared-file spool budget exceeded")
            if output_path:
                self.runtime.files._force_cleanup(output_path)
            return service_busy(
                "Temporary file capacity is full. Please try again after active transfers finish.",
                retry_after=10,
            )
        except subprocess.TimeoutExpired:
            logger.error("[CONV ERR] ffmpeg timeout")
            try:
                if output_path and os.path.exists(output_path):
                    os.unlink(output_path)
                    self.runtime.files._unregister_cleanup(output_path)
            except Exception as exc:
                self.runtime.files._log_cleanup_failure("remove timed-out conversion output", exc)
            return jsonify({
                "error": "Conversion timed out.",
                "error_code": "request_timeout",
            }), 504
        except Exception as e:
            error_msg = str(e)
            logger.error("[CONV ERR] %s", _redact_log_text(error_msg)[:200])
            try:
                if output_path and os.path.exists(output_path):
                    os.unlink(output_path)
                    self.runtime.files._unregister_cleanup(output_path)
            except Exception as cleanup_exc:
                self.runtime.files._log_cleanup_failure("remove failed conversion output", cleanup_exc)
            return jsonify({
                "error": "An error occurred during conversion.",
                "error_code": "conversion_failed",
            }), 400
        finally:
            try:
                if input_path and os.path.exists(input_path):
                    os.unlink(input_path)
                    self.runtime.files._unregister_cleanup(input_path)
            except Exception as exc:
                self.runtime.files._log_cleanup_failure("finalize conversion input cleanup", exc)
