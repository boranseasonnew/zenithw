"""Characterization tests for downloader invariants without starting Flask.

The production module starts background threads and installs socket guards at
import time. These tests extract pure/small functions from its AST so local and
CI checks remain deterministic and never contact media providers.
"""

import ast
import math
import os
import re
import subprocess
import tempfile
import threading
import time
import unittest
from collections import defaultdict
from pathlib import Path
from types import SimpleNamespace


APP_PATH = Path(__file__).resolve().parents[1] / "app.py"
APP_SOURCE = APP_PATH.read_text(encoding="utf-8")
APP_TREE = ast.parse(APP_SOURCE, filename=str(APP_PATH))
FRONTEND_DIR = APP_PATH.parents[1] / "frontend"
FRONTEND_APP_PATH = next(FRONTEND_DIR.glob("app.*.js"))
FRONTEND_SOURCE = FRONTEND_APP_PATH.read_text(encoding="utf-8")


def load_function(name, namespace):
    node = next(
        item for item in APP_TREE.body
        if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)) and item.name == name
    )
    module = ast.Module(body=[node], type_ignores=[])
    ast.fix_missing_locations(module)
    exec(compile(module, str(APP_PATH), "exec"), namespace)
    return namespace[name]


def function_source(name):
    node = next(
        item for item in APP_TREE.body
        if isinstance(item, ast.FunctionDef) and item.name == name
    )
    return ast.get_source_segment(APP_SOURCE, node)


def download_source():
    return function_source("download")


def orchestration_source():
    """download() plus the units docs/OPTIMIZATIONS.md Finding 11 extracted from
    it (option planning, attempt execution, media post-processing, job
    finalizer). Route-wide
    invariants (single extraction call, cleanup coverage) are checked across
    all five, since the logic now lives across them rather than only inline.
    """
    return "\n".join(function_source(name) for name in (
        "build_download_options",
        "run_download_attempts",
        "apply_mute_postprocessing",
        "finalize_prepared_download",
        "download",
    ))


class SourceHealthTests(unittest.TestCase):
    def test_backend_source_compiles(self):
        compile(APP_SOURCE, str(APP_PATH), "exec")

    def test_hosted_youtube_handoff_is_reversible_and_machine_readable(self):
        self.assertIn('YOUTUBE_WEB_ENABLED = os.environ.get("YOUTUBE_WEB_ENABLED", "0")', APP_SOURCE)
        handoff = function_source("youtube_app_required_response")
        self.assertIn('"error_code": "youtube_app_required"', handoff)
        self.assertIn('"desktop_app_url": "/pc-app.html"', handoff)
        self.assertIn('"mobile_app_url": "/app.html"', handoff)
        self.assertIn("response.status_code = 503", handoff)
        for route in ("get_info", "download", "download_thumbnail"):
            source = function_source(route)
            self.assertIn("not YOUTUBE_WEB_ENABLED", source)
            self.assertIn("youtube_app_required_response()", source)

    def test_proxy_fix_can_be_disabled_and_has_bounded_hops(self):
        self.assertIn('if TRUST_PROXY:', APP_SOURCE)
        self.assertIn('PROXY_HOPS = _bounded_env_int("PROXY_HOPS", 1, 1, 8)', APP_SOURCE)
        self.assertIn('x_for=PROXY_HOPS', APP_SOURCE)

    def test_client_ip_does_not_parse_raw_x_forwarded_for(self):
        source = function_source("get_client_ip")
        self.assertNotIn("request.headers.get('X-Forwarded-For')", source)
        self.assertIn("origin_secret_valid", source)
        self.assertIn("_is_cloudflare_ip(remote_ip)", source)

    def test_info_auth_errors_can_reach_cookie_fallback(self):
        source = function_source("get_info_with_slot")
        self.assertIn("future_cookie_profile", source)
        self.assertIn("auth_required and not future_cookie_profile", source)

    def test_info_does_not_spend_cookie_profile_on_ordinary_failure(self):
        source = function_source("get_info_with_slot")
        self.assertIn("next_has_cookies and not auth_required", source)

    def test_thumbnail_stops_rate_limit_and_unnecessary_cookie_retries(self):
        source = function_source("download_thumbnail_with_slot")
        self.assertIn('"429" in es or "too many requests" in es', source)
        self.assertIn("next_has_cookies and not auth_required", source)

    def test_runtime_remote_components_are_disabled(self):
        source = function_source("get_base_opts")
        self.assertNotIn('opts["remote_components"]', source)

    def test_youtube_user_agent_can_match_cookie_browser_without_changing_other_sources(self):
        source = function_source("get_base_opts")
        self.assertIn('YOUTUBE_USER_AGENT if is_youtube(url) else DEFAULT_USER_AGENT', source)
        self.assertIn('YOUTUBE_USER_AGENT = os.environ.get("YOUTUBE_USER_AGENT", "").strip()', APP_SOURCE)

    def test_diagnostics_requires_a_separate_bearer_token(self):
        source = function_source("diagnostics")
        self.assertIn('authorization.startswith("Bearer ")', source)
        self.assertIn("hmac.compare_digest(supplied_token, DIAGNOSTICS_TOKEN)", source)
        self.assertIn('{"error": "Not Found"}', source)
        self.assertIn('response.headers["Cache-Control"] = "no-store, max-age=0"', source)

    def test_public_liveness_probe_has_no_payload(self):
        source = function_source("health")
        self.assertIn("app.response_class(status=204)", source)
        self.assertNotIn("jsonify", source)
        self.assertIn('response.headers["X-Robots-Tag"] = "noindex, nofollow"', source)

    def test_public_status_hides_operational_capacity_and_secrets(self):
        source = function_source("public_status")
        self.assertIn('"components"', source)
        self.assertIn('"media_processing"', source)
        self.assertNotIn("COOKIES_FILE", source)
        self.assertNotIn("MAX_CONCURRENT_DOWNLOADS", source)
        self.assertNotIn("queue_waiting", source)

    def test_socket_admission_is_globally_and_per_ip_bounded(self):
        source = function_source("on_connect")
        self.assertIn("MAX_SOCKET_CONNECTIONS", source)
        self.assertIn("MAX_SOCKET_CONNECTIONS_PER_IP", source)
        self.assertIn("return False", source)
        self.assertIn('"ip": client_ip', source)

    def test_log_redaction_removes_query_and_fragment(self):
        namespace = {
            "urlparse": __import__("urllib.parse", fromlist=["urlparse"]).urlparse,
            "hashlib": __import__("hashlib"),
        }
        safe_log_url = load_function("_safe_log_url", namespace)
        value = safe_log_url(
            "https://user:password@example.com/watch?v=secret&token=abc#fragment"
        )
        self.assertEqual(value, "https://example.com/watch")
        self.assertNotIn("secret", value)
        self.assertNotIn("password", value)


class ClientIpTrustTests(unittest.TestCase):
    def _call(self, *, remote, headers, trust_proxy=True, cloudflare_peer=False):
        namespace = {
            "request": SimpleNamespace(remote_addr=remote, headers=headers),
            "TRUST_PROXY": trust_proxy,
            "ORIGIN_SECRET_VALUE": "origin-secret",
            "ORIGIN_SECRET_HEADER": "X-Origin-Verify",
            "hmac": SimpleNamespace(compare_digest=lambda a, b: a == b),
            "_normalize_client_ip": load_function(
                "_normalize_client_ip", {"ipaddress": __import__("ipaddress")}
            ),
            "_is_cloudflare_ip": lambda value: cloudflare_peer,
        }
        return load_function("get_client_ip", namespace)()

    def test_direct_client_cannot_spoof_cloudflare_header(self):
        self.assertEqual(self._call(
            remote="203.0.113.10",
            headers={"CF-Connecting-IP": "198.51.100.44"},
        ), "203.0.113.10")

    def test_origin_secret_authenticates_cloudflare_header(self):
        self.assertEqual(self._call(
            remote="10.0.0.8",
            headers={
                "CF-Connecting-IP": "198.51.100.44",
                "X-Origin-Verify": "origin-secret",
            },
        ), "198.51.100.44")

    def test_disabled_proxy_mode_ignores_all_forwarded_headers(self):
        self.assertEqual(self._call(
            remote="203.0.113.10",
            headers={
                "CF-Connecting-IP": "198.51.100.44",
                "X-Origin-Verify": "origin-secret",
            },
            trust_proxy=False,
        ), "203.0.113.10")

    def test_ffmpeg_thread_limit_covers_ytdlp_and_convert(self):
        base_source = function_source("get_base_opts")
        convert_source = function_source("convert_file_with_slot")
        self.assertIn('"ffmpeg": ["-threads", str(FFMPEG_THREADS)]', base_source)
        self.assertIn("'-threads', str(FFMPEG_THREADS)", convert_source)

    def test_single_extraction_and_native_token_handoff_are_preserved(self):
        source = orchestration_source()
        self.assertEqual(source.count("extract_info(url, download=True)"), 1)
        plan_source = function_source("build_download_options")
        self.assertIn('extra["noplaylist"] = True', plan_source)
        self.assertIn('extra["match_filter"] = enforce_download_limits', plan_source)
        self.assertEqual(source.count("prepare_native_download("), 1)
        self.assertIn('"download_url": f"/files/{token}"', source)

    def test_all_terminal_failure_paths_use_scoped_cleanup_helpers(self):
        source = orchestration_source()
        self.assertNotIn("f.startswith(filename)", source)
        self.assertGreaterEqual(source.count("discard_cancel_event(download_id)"), 10)
        self.assertGreaterEqual(source.count("cleanup_download_artifacts(filename)"), 3)

    def test_finding_11_extraction_is_wired_up_and_route_stays_small(self):
        """docs/OPTIMIZATIONS.md Finding 11: attempt execution, media
        post-processing, and job finalization must be extracted units the
        route calls into, not inline logic -- and the route itself should
        stay small enough to reason about without them.
        """
        source = download_source()
        self.assertIn("make_download_progress_hook(", source)
        self.assertIn("build_download_options(", source)
        self.assertIn("run_download_attempts(", source)
        self.assertIn("apply_mute_postprocessing(", source)
        self.assertIn("finalize_prepared_download(", source)
        # Regression guard: route previously spanned ~470 lines (all hot-path
        # concerns inline). It should now be meaningfully smaller.
        self.assertLess(len(source.splitlines()), 250)

    def test_converter_rejects_limits_instead_of_silently_truncating(self):
        source = function_source("convert_file_with_slot")
        self.assertNotIn("'-t'", source)
        self.assertNotIn("'-fs'", source)
        self.assertIn("probe_media_duration(input_path)", source)
        self.assertIn("if input_duration is None:", source)
        self.assertIn("run_ffmpeg_with_output_limit(", source)
        self.assertIn('"error_code": "media_probe_failed"', source)
        self.assertIn('"error_code": "video_too_long"', source)

    def test_native_transfer_path_is_leased_until_response_close(self):
        route_source = function_source("download_prepared_file")
        cleanup_source = function_source("cleanup_old_files")
        self.assertIn("acquire_transfer_path_lease(path)", route_source)
        self.assertIn("release_transfer_path_lease(path)", route_source)
        self.assertIn("response.direct_passthrough = False", route_source)
        self.assertIn("cleanup_path_if_not_leased(fpath)", cleanup_source)
        self.assertIn("cleanup_path_if_not_leased(path)", cleanup_source)

    def test_send_file_cleanup_callbacks_are_not_bypassed(self):
        self.assertIn(
            "response.direct_passthrough = False",
            function_source("download_prepared_file"),
        )
        self.assertIn(
            "response.direct_passthrough = False",
            function_source("download_thumbnail_with_slot"),
        )

    def test_thumbnail_attempts_clean_token_scoped_artifacts(self):
        source = function_source("download_thumbnail_with_slot")
        self.assertIn(
            "cleanup_download_artifacts(filename, keep_paths=(full_path,))",
            source,
        )
        self.assertGreaterEqual(
            source.count("cleanup_download_artifacts(filename)"),
            3,
        )

    def test_native_handoff_reports_actual_transfer_completion(self):
        route_source = function_source("download_prepared_file")
        status_source = function_source("prepared_transfer_status")
        finalize_source = function_source("finalize_prepared_download")
        convert_source = function_source("convert_file_with_slot")
        self.assertIn("_tracked_transfer", route_source)
        self.assertIn('terminal_state = "completed"', route_source)
        self.assertIn('state["expires_at"] = time.time()', status_source)
        self.assertIn('"transfer_status_url"', finalize_source)
        self.assertIn('"transfer_status_url"', convert_source)
        self.assertIn("waitForNativeTransfer", FRONTEND_SOURCE)

    def test_progress_and_cancellation_are_job_scoped(self):
        emit_source = function_source("emit_job_progress")
        cancel_source = function_source("cancel_route")
        self.assertIn('payload["download_id"] = download_id', emit_source)
        self.assertIn("cancel_rate_limiter.add(ip)", cancel_source)
        self.assertIn("d.download_id!==activeProgressJobId", FRONTEND_SOURCE)
        self.assertIn("await cancelBackendJob", FRONTEND_SOURCE)

    def test_readiness_and_transcode_budget_are_explicit(self):
        readiness_source = function_source("readiness")
        convert_source = function_source("convert_file_with_slot")
        self.assertIn("has_minimum_free_disk()", readiness_source)
        self.assertIn("MAX_SPOOL_SIZE_BYTES", readiness_source)
        self.assertIn('logical_spool = spool["reserved_bytes"]', readiness_source)
        self.assertNotIn('spool["reserved_bytes"] + spool["prepared_bytes"]', readiness_source)
        self.assertIn("MAX_TRANSCODE_DURATION_SECONDS", convert_source)
        self.assertIn('"error_code": "conversion_too_long"', convert_source)

    def test_public_status_exposes_safe_runtime_capabilities(self):
        source = function_source("public_status")
        self.assertIn('"components"', source)
        self.assertIn('"media_processing"', source)
        self.assertIn('"job_intake"', source)
        self.assertNotIn("COOKIES_FILE", source)
        self.assertNotIn("active_downloads", source)
        self.assertNotIn("MAX_CONCURRENT_DOWNLOADS", source)
        self.assertNotIn("free_disk", source)
        self.assertNotIn("ORIGIN_SECRET", source)

    def test_frontend_transfer_has_total_and_idle_timeouts(self):
        self.assertIn("PREPARED_TRANSFER_TIMEOUT_MS", FRONTEND_SOURCE)
        self.assertIn("PREPARED_TRANSFER_IDLE_MS", FRONTEND_SOURCE)
        self.assertIn("reader.cancel", FRONTEND_SOURCE)
        self.assertIn("createSocketClient", FRONTEND_SOURCE)


class TransferStateTests(unittest.TestCase):
    def setUp(self):
        self.states = {
            "token": {
                "state": "prepared",
                "transferred_bytes": 0,
                "expires_at": 0,
            }
        }
        self.update = load_function("update_transfer_state", {
            "_prepared_files_lock": threading.RLock(),
            "_transfer_states": self.states,
            "time": time,
            "PREPARED_FILE_TTL": 30,
            "PENDING_CLEANUP_MAX_AGE": 90,
        })

    def test_progress_is_recorded_and_terminal_state_gets_short_ttl(self):
        before = time.time()
        self.update("token", "transferring", 1024)
        self.assertEqual(self.states["token"]["transferred_bytes"], 1024)
        self.assertGreaterEqual(self.states["token"]["expires_at"], before + 89)
        self.update("token", "completed", 2048, terminal=True)
        self.assertEqual(self.states["token"]["state"], "completed")
        self.assertLess(self.states["token"]["expires_at"], time.time() + 31)


class FormatPlanningTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.build_format_str = staticmethod(load_function("build_format_str", {
            "AUDIO_FMTS": {"mp3", "flac", "wav", "ogg", "opus", "m4a"},
            "is_youtube": lambda url: "youtube.com" in url or "youtu.be" in url,
        }))

    def test_youtube_mute_selects_video_only(self):
        selector = self.build_format_str(
            "https://www.youtube.com/watch?v=abcdefghijk", "1080", "mp4", "h264", mute=True
        )
        self.assertIn("bestvideo", selector)
        self.assertNotIn("bestaudio", selector)

    def test_normal_youtube_video_keeps_audio_fallback(self):
        selector = self.build_format_str(
            "https://youtu.be/abcdefghijk", "1080", "mp4", "h264", mute=False
        )
        self.assertIn("bestaudio", selector)

    def test_audio_mode_remains_audio_only(self):
        self.assertEqual(
            self.build_format_str("https://example.com/video", "1080", "mp3", "h264"),
            "bestaudio/best",
        )


class DownloadOptionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.limit_filter = staticmethod(lambda info, incomplete=False: None)

        def get_opts_list(url, *, extra, youtube_video_fallback):
            return {
                "url": url,
                "extra": extra,
                "youtube_video_fallback": youtube_video_fallback,
            }

        cls.build_options = staticmethod(load_function("build_download_options", {
            "build_format_str": lambda url, quality, fmt, codec, mute=False: "selected-format",
            "FFMPEG_DIR": "ffmpeg",
            "enforce_download_limits": cls.limit_filter,
            "get_opts_list": get_opts_list,
            "is_youtube": lambda url: "youtube.com" in url,
        }))

    def _build(self, **overrides):
        values = {
            "quality": "1080",
            "fmt": "mp4",
            "codec": "h264",
            "audio_q": "192",
            "mute": False,
            "is_audio": False,
            "add_meta": False,
            "want_sponsorblock": False,
            "sb_categories": ["sponsor"],
            "sb_mode": "mark",
            "want_subs": False,
            "sub_langs": ["en"],
            "filepath": "download/job",
            "progress_hook": object(),
        }
        values.update(overrides)
        return self.build_options("https://youtube.com/watch?v=abcdefghijk", **values)

    def test_video_plan_keeps_single_item_limits_and_optional_processors(self):
        result = self._build(add_meta=True, want_sponsorblock=True, sb_mode="remove", want_subs=True)
        extra = result["extra"]
        self.assertEqual(extra["format"], "selected-format")
        self.assertEqual(extra["merge_output_format"], "mp4")
        self.assertTrue(extra["noplaylist"])
        self.assertIs(extra["match_filter"], self.limit_filter)
        self.assertTrue(result["youtube_video_fallback"])
        self.assertEqual(
            [processor["key"] for processor in extra["postprocessors"]],
            ["FFmpegMetadata", "SponsorBlock", "ModifyChapters", "FFmpegEmbedSubtitle"],
        )

    def test_audio_plan_extracts_requested_codec_without_video_fallback(self):
        result = self._build(fmt="mp3", is_audio=True, audio_q="320", want_subs=True)
        extra = result["extra"]
        extractor = extra["postprocessors"][0]
        self.assertEqual(extractor["key"], "FFmpegExtractAudio")
        self.assertEqual(extractor["preferredcodec"], "mp3")
        self.assertEqual(extractor["preferredquality"], "320")
        self.assertNotIn("writesubtitles", extra)
        self.assertFalse(result["youtube_video_fallback"])


class YouTubeClientLadderTests(unittest.TestCase):
    def _load(self, *, cookie_exists=True):
        namespace = {
            "youtube_health": SimpleNamespace(order=lambda profiles: profiles),
            "POT_PROVIDER_URL": "http://pot-provider:4416",
            "is_youtube": lambda url: "youtube.com" in url or "youtu.be" in url,
            "get_base_opts": lambda url, use_cookies=True, youtube_player_clients=None: {
                "extractor_args": {
                    "youtube": {"player_client": youtube_player_clients or ["mweb"]},
                },
                **({"cookiefile": "/tmp/cookies.txt"} if use_cookies and cookie_exists else {}),
            },
        }
        return load_function("get_opts_list", namespace)

    def test_youtube_prefers_verified_cookie_profile_with_anonymous_recovery(self):
        opts_list = self._load()(
            "https://youtube.com/watch?v=abcdefghijk",
            extra={"format": "selected-format"},
            youtube_video_fallback=True,
        )
        self.assertEqual(
            [opts["extractor_args"]["youtube"]["player_client"] for opts in opts_list],
            [["default"], ["mweb"], ["default"], ["mweb"]],
        )
        self.assertEqual(
            ["cookiefile" in opts for opts in opts_list],
            [True, True, False, False],
        )
        self.assertTrue(all(opts["format"] == "selected-format" for opts in opts_list))

    def test_missing_cookie_does_not_duplicate_the_default_profile(self):
        opts_list = self._load(cookie_exists=False)(
            "https://youtu.be/abcdefghijk",
            youtube_video_fallback=False,
        )
        self.assertEqual(len(opts_list), 2)
        self.assertEqual(
            [opts["extractor_args"]["youtube"]["player_client"] for opts in opts_list],
            [["default"], ["mweb"]],
        )


class DownloadLimitTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.enforce_download_limits = staticmethod(load_function("enforce_download_limits", {
            "MAX_VIDEO_DURATION_SECONDS": 3600,
        }))

    def test_playlist_container_is_rejected_but_single_entry_is_allowed(self):
        container = {"playlist": "Mix", "protocol": "https"}
        entry = {"playlist": "Mix", "playlist_index": 1, "protocol": "https"}
        self.assertIn("Playlist downloads are not supported", self.enforce_download_limits(container, incomplete=True))
        self.assertIsNone(self.enforce_download_limits(entry, incomplete=True))

    def test_duration_and_protocol_limits_are_preserved(self):
        self.assertIn("Video too long", self.enforce_download_limits({"duration": 3601, "protocol": "https"}))
        self.assertIn("protocol", self.enforce_download_limits({"duration": 60, "protocol": "https+file"}).lower())
        self.assertIsNone(self.enforce_download_limits({"duration": 60, "protocol": "m3u8_native+https"}))


class RequestParsingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        class DownloadRequestError(ValueError):
            pass

        cls.error_type = DownloadRequestError
        cls.parse_download_request = staticmethod(load_function("parse_download_request", {
            "DownloadRequestError": DownloadRequestError,
            "ALLOWED_DOWNLOAD_FORMATS": {"mp4", "webm", "mkv", "avi", "mov", "mp3"},
            "ALLOWED_VIDEO_CODECS": {"h264", "av1", "vp9"},
            "ALLOWED_SPONSORBLOCK_CATEGORIES": {"sponsor", "intro"},
            "AUDIO_FMTS": {"mp3"},
            "FFMPEG_DIR": "ffmpeg",
            "is_safe_url": lambda url: url.startswith("https://"),
            "is_youtube_live_url": lambda url: False,
            "is_unsupported_domain": lambda url: False,
            "is_youtube": lambda url: "youtube.com" in url,
        }))

    def test_valid_request_is_normalized_before_job_reservation(self):
        parsed = self.parse_download_request({
            "url": " https://youtube.com/watch?v=abcdefghijk ",
            "format": "MP4",
            "codec": "H264",
            "quality": 1080,
            "audioQ": "invalid",
            "mute": True,
            "sub_langs": ["tr", "bad/lang", "en"],
            "sponsorblock_categories": ["sponsor", "unknown", {}, [], None, 1],
        })
        self.assertEqual(parsed["url"], "https://youtube.com/watch?v=abcdefghijk")
        self.assertEqual(parsed["audio_q"], "256")
        self.assertEqual(parsed["sub_langs"], ["tr", "en"])
        self.assertEqual(parsed["sb_categories"], ["sponsor"])
        self.assertTrue(parsed["youtube_video_only_mute"])
        self.assertFalse(parsed["mute_needs_strip"])

    def test_invalid_body_and_format_fail_before_state_is_reserved(self):
        with self.assertRaisesRegex(self.error_type, "Invalid request body"):
            self.parse_download_request([])
        with self.assertRaisesRegex(self.error_type, "Unsupported format"):
            self.parse_download_request({"url": "https://example.com/video", "format": "exe"})


class PlatformPolicyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        hostname = lambda url: __import__("urllib.parse", fromlist=["urlparse"]).urlparse(url).hostname or ""
        matches = lambda value, domain: value == domain or value.endswith("." + domain)
        cls.is_unsupported_domain = staticmethod(load_function("is_unsupported_domain", {
            "_get_hostname": hostname,
            "_hostname_matches": matches,
            "UNSUPPORTED_DOMAINS": (
                "spotify.com", "music.apple.com", "deezer.com", "tidal.com", "music.amazon.com",
            ),
        }))
        is_pornhub = load_function("is_pornhub", {
            "_get_hostname": hostname,
            "_hostname_matches": matches,
        })
        cls.is_pornhub = staticmethod(is_pornhub)
        cls.classify_error = staticmethod(load_function("classify_error", {
            "is_youtube": lambda url: False,
            "is_instagram": lambda url: False,
            "is_tiktok": lambda url: False,
            "is_pornhub": is_pornhub,
        }))

    def test_pornhub_is_not_blocked_by_unsupported_domain_policy(self):
        self.assertFalse(self.is_unsupported_domain("https://www.pornhub.com/view_video.php?viewkey=example"))

    def test_declared_unsupported_music_domains_remain_blocked(self):
        self.assertTrue(self.is_unsupported_domain("https://open.spotify.com/track/example"))

    def test_pornhub_domains_are_recognized_without_matching_lookalikes(self):
        self.assertTrue(self.is_pornhub("https://www.pornhub.com/view_video.php?viewkey=example"))
        self.assertTrue(self.is_pornhub("https://www.pornhubpremium.com/view_video.php?viewkey=example"))
        self.assertFalse(self.is_pornhub("https://notpornhub.com/view_video.php?viewkey=example"))

    def test_pornhub_upstream_failures_are_not_reported_as_generic_requests(self):
        self.assertEqual(
            self.classify_error(
                "Unable to download webpage: HTTP Error 403: Forbidden",
                "https://www.pornhub.com/view_video.php?viewkey=example",
            ),
            "platform_restricted",
        )


class CleanupLifecycleTests(unittest.TestCase):
    def test_artifact_cleanup_is_token_scoped(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            token = "abc12345"
            own_files = [f"{token}.mp4", f"{token}.part"]
            other_file = f"{token}9.mp4"
            for name in [*own_files, other_file]:
                Path(temp_dir, name).write_bytes(b"test")

            def force_cleanup(path):
                os.remove(path)

            cleanup = load_function("cleanup_download_artifacts", {
                "DOWNLOAD_DIR": temp_dir,
                "DOWNLOAD_ID_RE": re.compile(r"^[A-Za-z0-9_-]{8,64}$"),
                "_force_cleanup": force_cleanup,
                "_spool_path_key": lambda path: os.path.normcase(
                    os.path.realpath(os.path.abspath(path))
                ),
                "os": os,
            })
            final_path = str(Path(temp_dir, own_files[0]))
            self.assertEqual(cleanup(token, keep_paths=(final_path,)), 1)
            self.assertTrue(Path(final_path).exists())
            self.assertFalse(Path(temp_dir, own_files[1]).exists())
            self.assertEqual(cleanup(token), 1)
            self.assertFalse(Path(final_path).exists())
            self.assertTrue(Path(temp_dir, other_file).exists())
            self.assertEqual(cleanup("bad/token"), 0)

    def test_leased_transfer_path_cannot_be_cleaned(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = str(Path(temp_dir, "active.mp4"))
            Path(path).write_bytes(b"active transfer")
            namespace = {
                "os": os,
                "_active_transfer_paths": defaultdict(int),
                "_active_transfer_paths_lock": threading.Lock(),
                "_force_cleanup": os.remove,
            }
            namespace["_spool_path_key"] = load_function("_spool_path_key", namespace)
            acquire = load_function("acquire_transfer_path_lease", namespace)
            release = load_function("release_transfer_path_lease", namespace)
            cleanup = load_function("cleanup_path_if_not_leased", namespace)

            acquire(path)
            self.assertFalse(cleanup(path))
            self.assertTrue(Path(path).exists())
            release(path)
            self.assertTrue(cleanup(path))
            self.assertFalse(Path(path).exists())

    def test_cancel_event_discard_is_idempotent(self):
        events = {"download01": object()}
        discard = load_function("discard_cancel_event", {
            "cancel_events": events,
            "cancel_events_lock": threading.Lock(),
        })
        discard("download01")
        discard("download01")
        self.assertEqual(events, {})


class ConversionGuardTests(unittest.TestCase):
    def test_probe_uses_longest_valid_declared_duration(self):
        fake_subprocess = SimpleNamespace(
            run=lambda *a, **k: SimpleNamespace(
                returncode=0,
                stdout="60\n120.5\nN/A\n",
                stderr="",
            ),
            SubprocessError=subprocess.SubprocessError,
        )
        probe = load_function("probe_media_duration", {
            "FFPROBE_PATH": "ffprobe",
            "FFMPEG_PATH": "ffmpeg",
            "FFMPEG_DIR": None,
            "FFMPEG_LOCAL_PROTOCOLS": "file,pipe",
            "FFMPEG_TIMEOUT": 30,
            "subprocess": fake_subprocess,
            "math": math,
            "os": os,
            "re": re,
        })
        self.assertEqual(probe("input.mp4"), 120.5)

    def test_probe_falls_back_to_ffmpeg_header_when_ffprobe_is_missing(self):
        fake_subprocess = SimpleNamespace(
            run=lambda *a, **k: SimpleNamespace(
                returncode=1,
                stdout="",
                stderr="Duration: 01:02:03.50, start: 0.000000, bitrate: 128 kb/s",
            ),
            SubprocessError=subprocess.SubprocessError,
        )
        probe = load_function("probe_media_duration", {
            "FFPROBE_PATH": None,
            "FFMPEG_PATH": "ffmpeg",
            "FFMPEG_DIR": None,
            "FFMPEG_LOCAL_PROTOCOLS": "file,pipe",
            "FFMPEG_TIMEOUT": 30,
            "subprocess": fake_subprocess,
            "math": math,
            "os": os,
            "re": re,
        })
        self.assertEqual(probe("input.mp4"), 3723.5)

    def test_ffmpeg_is_killed_when_output_reaches_size_limit(self):
        processes = []

        class FakeProcess:
            def __init__(self):
                self.returncode = None
                self.killed = False

            def poll(self):
                return self.returncode

            def kill(self):
                self.killed = True
                self.returncode = -9

            def communicate(self):
                return "", "stopped at size limit"

        def popen(*a, **k):
            process = FakeProcess()
            processes.append(process)
            return process

        fake_subprocess = SimpleNamespace(
            Popen=popen,
            DEVNULL=subprocess.DEVNULL,
            PIPE=subprocess.PIPE,
            CompletedProcess=subprocess.CompletedProcess,
            TimeoutExpired=subprocess.TimeoutExpired,
        )
        run_limited = load_function("run_ffmpeg_with_output_limit", {
            "subprocess": fake_subprocess,
            "time": time,
            "os": os,
            "MAX_CONVERT_OUTPUT_SIZE_BYTES": 4,
            "FFMPEG_TIMEOUT": 30,
        })
        with tempfile.TemporaryDirectory() as temp_dir:
            output_path = str(Path(temp_dir, "output.mp4"))
            Path(output_path).write_bytes(b"1234")
            result, exceeded = run_limited(["ffmpeg"], output_path)

        self.assertTrue(exceeded)
        self.assertTrue(processes[0].killed)
        self.assertEqual(result.returncode, -9)


class _Logger:
    def info(self, *a, **k):
        pass

    def error(self, *a, **k):
        pass


class _NullScope:
    def __call__(self, *a, **k):
        return self

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


class _GeventTimeout:
    """Stand-in for gevent.Timeout: a context manager that does not
    actually enforce a deadline, so tests stay deterministic."""

    def __init__(self, *a, **k):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


class _FakeDownloadCancelled(Exception):
    pass


class _FakeYtDlpModule:
    """Minimal stand-in for the yt_dlp module surface run_download_attempts
    touches: utils.DownloadCancelled and a YoutubeDL context manager whose
    extract_info() is scripted per-test via a queue of callables."""

    def __init__(self, behaviors):
        self._behaviors = list(behaviors)
        self.calls = 0

        class _Utils:
            DownloadCancelled = _FakeDownloadCancelled
        self.utils = _Utils()

        outer = self

        class _YoutubeDL:
            def __init__(self, opts):
                self.opts = opts

            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

            def extract_info(self, url, download=True):
                behavior = outer._behaviors[outer.calls]
                outer.calls += 1
                return behavior()

        self.YoutubeDL = _YoutubeDL


class AttemptExecutionTests(unittest.TestCase):
    """docs/OPTIMIZATIONS.md Finding 11: attempt execution was extracted from the
    /download route into run_download_attempts(). These tests cover the
    retry-ladder decisions that make the loop non-trivial, without touching
    a real extractor.
    """

    def _load(self, behaviors, *, youtube=False):
        reap_calls = []
        cleanup_calls = []
        fake_yt_dlp = _FakeYtDlpModule(behaviors)

        class _DownloadAttemptResult:
            def __init__(self, success=False, full_path=None, video_title=None,
                         timed_out=False, last_err=None, primary_err=None):
                self.success = success
                self.full_path = full_path
                self.video_title = video_title
                self.timed_out = timed_out
                self.last_err = last_err
                self.primary_err = primary_err

        namespace = {
            "DownloadAttemptResult": _DownloadAttemptResult,
            "is_youtube": lambda url: youtube,
            "logger": _Logger(),
            "_redact_log_text": lambda value: str(value),
            "_snapshot_child_pids": lambda: set(),
            "_reap_new_children": lambda before, download_id, filename: reap_calls.append(1),
            "cleanup_download_artifacts": lambda filename, keep_paths=None: cleanup_calls.append(
                (filename, tuple(keep_paths or ()))
            ),
            "gevent": type("gevent", (), {"Timeout": _GeventTimeout}),
            "yt_dlp": fake_yt_dlp,
            "SafeYoutubeDL": fake_yt_dlp.YoutubeDL,
            "_pot_provider_network_scope": _NullScope(),
            "youtube_observation": lambda *args: _GeventTimeout(),
            "enforce_download_limits": lambda info, incomplete=False: None,
            "resolve_downloaded_media_path": lambda info, filename: info.get("_path"),
            "selected_video_dimensions": lambda info: (None, None),
            "remember_primary_error": lambda primary, candidate: primary or candidate,
            "is_cookie_configuration_error": load_function(
                "is_cookie_configuration_error", {}
            ),
            "is_youtube_auth_required_error": load_function(
                "is_youtube_auth_required_error", {}
            ),
            "DOWNLOAD_TIMEOUT_SECONDS": 30,
            "time": time,
        }
        fn = load_function("run_download_attempts", namespace)
        return fn, reap_calls, cleanup_calls

    def test_cookie_error_falls_through_to_next_attempt_which_succeeds(self):
        def first():
            raise ValueError("invalid cookies file, please refresh")

        def second():
            return {"_path": "/tmp/final.mp4", "title": "Second Attempt"}

        fn, reap_calls, cleanup_calls = self._load([first, second])
        result = fn(
            "https://example.com/video", [{"cookiefile": "/tmp/cookies.txt"}, {}],
            download_id="d1", filename="f1", video_title=None,
            request_deadline=time.monotonic() + 30,
            cancel_event=threading.Event(),
        )
        self.assertTrue(result.success)
        self.assertEqual(result.full_path, "/tmp/final.mp4")
        self.assertEqual(result.video_title, "Second Attempt")
        self.assertEqual(len(reap_calls), 1)  # only the failed first attempt reaps
        self.assertEqual(cleanup_calls, [
            ("f1", ()),
            ("f1", ("/tmp/final.mp4",)),
        ])

    def test_youtube_cookie_advice_is_not_treated_as_cookie_file_failure(self):
        def auth_failure():
            raise ValueError(
                "Sign in to confirm you are not a bot. "
                "Use --cookies-from-browser or --cookies for the authentication"
            )

        def unreachable_anonymous_attempt():
            raise AssertionError("anonymous profiles cannot satisfy an auth requirement")

        fn, reap_calls, _ = self._load(
            [auth_failure, auth_failure, unreachable_anonymous_attempt],
            youtube=True,
        )
        opts_list = [
            {
                "cookiefile": "/tmp/cookies.txt",
                "extractor_args": {"youtube": {"player_client": ["default"]}},
            },
            {
                "cookiefile": "/tmp/cookies.txt",
                "extractor_args": {"youtube": {"player_client": ["mweb"]}},
            },
            {"extractor_args": {"youtube": {"player_client": ["default"]}}},
        ]
        result = fn(
            "https://youtube.com/watch?v=abcdefghijk", opts_list,
            download_id="d1", filename="f1", video_title=None,
            request_deadline=time.monotonic() + 30,
            cancel_event=threading.Event(),
        )
        self.assertFalse(result.success)
        self.assertEqual(len(reap_calls), 2)

    def test_rate_limit_error_stops_immediately_without_trying_fallback(self):
        def first():
            raise ValueError("HTTP Error 429: Too Many Requests")

        def unreachable():
            raise AssertionError("second attempt should not run after a 429")

        fn, _, cleanup_calls = self._load([first, unreachable])
        result = fn(
            "https://example.com/video", [{}, {}],
            download_id="d1", filename="f1", video_title=None,
            request_deadline=time.monotonic() + 30,
            cancel_event=threading.Event(),
        )
        self.assertFalse(result.success)
        self.assertIn("429", str(result.primary_err))
        self.assertEqual(cleanup_calls, [("f1", ())])

    def test_expired_deadline_is_reported_as_timeout_not_a_generic_failure(self):
        fn, _, cleanup_calls = self._load([lambda: {"_path": "/tmp/x.mp4"}])
        result = fn(
            "https://example.com/video", [{}],
            download_id="d1", filename="f1", video_title=None,
            request_deadline=time.monotonic() - 1,  # already expired
            cancel_event=threading.Event(),
        )
        self.assertTrue(result.timed_out)
        self.assertFalse(result.success)
        self.assertEqual(cleanup_calls, [("f1", ())])

    def test_youtube_403_switches_from_default_to_mweb_once(self):
        def first():
            raise ValueError("unable to download video data: HTTP Error 403: Forbidden")

        def second():
            return {"_path": "/tmp/final.mp4", "title": "mweb fallback"}

        fn, _, _ = self._load([first, second], youtube=True)
        opts_list = [
            {"extractor_args": {"youtube": {"player_client": ["default"]}}},
            {"extractor_args": {"youtube": {"player_client": ["mweb"]}}},
        ]
        result = fn(
            "https://youtube.com/watch?v=abcdefghijk", opts_list,
            download_id="d1", filename="f1", video_title=None,
            request_deadline=time.monotonic() + 30,
            cancel_event=threading.Event(),
        )
        self.assertTrue(result.success)
        self.assertEqual(result.video_title, "mweb fallback")

    def test_mweb_403_does_not_spend_account_cookie_fallback(self):
        def default_403():
            raise ValueError("unable to download video data: HTTP Error 403: Forbidden")

        def mweb_403():
            raise ValueError("unable to download video data: HTTP Error 403: Forbidden")

        def unreachable_cookie_attempt():
            raise AssertionError("403 must not be retried with account cookies")

        fn, reap_calls, _ = self._load(
            [default_403, mweb_403, unreachable_cookie_attempt],
            youtube=True,
        )
        opts_list = [
            {"extractor_args": {"youtube": {"player_client": ["default"]}}},
            {"extractor_args": {"youtube": {"player_client": ["mweb"]}}},
            {
                "cookiefile": "/tmp/cookies.txt",
                "extractor_args": {"youtube": {"player_client": ["default"]}},
            },
        ]
        result = fn(
            "https://youtube.com/watch?v=abcdefghijk", opts_list,
            download_id="d1", filename="f1", video_title=None,
            request_deadline=time.monotonic() + 30,
            cancel_event=threading.Event(),
        )
        self.assertFalse(result.success)
        self.assertIn("403", str(result.primary_err))
        self.assertEqual(len(reap_calls), 2)

    def test_login_error_can_reach_the_cookie_only_profile(self):
        def default_login():
            raise ValueError("Sign in to confirm you are not a bot")

        def mweb_login():
            raise ValueError("Sign in to confirm you are not a bot")

        def cookie_success():
            return {"_path": "/tmp/private.mp4", "title": "cookie fallback"}

        fn, _, _ = self._load([default_login, mweb_login, cookie_success], youtube=True)
        opts_list = [
            {"extractor_args": {"youtube": {"player_client": ["default"]}}},
            {"extractor_args": {"youtube": {"player_client": ["mweb"]}}},
            {
                "cookiefile": "/tmp/cookies.txt",
                "extractor_args": {"youtube": {"player_client": ["default"]}},
            },
        ]
        result = fn(
            "https://youtube.com/watch?v=abcdefghijk", opts_list,
            download_id="d1", filename="f1", video_title=None,
            request_deadline=time.monotonic() + 30,
            cancel_event=threading.Event(),
        )
        self.assertTrue(result.success)
        self.assertEqual(result.video_title, "cookie fallback")

    def test_cancel_event_set_before_any_attempt_is_re_raised(self):
        fn, _, _ = self._load([lambda: {"_path": "/tmp/x.mp4"}])
        cancel_event = threading.Event()
        cancel_event.set()
        result = fn(
            "https://example.com/video", [{}],
            download_id="d1", filename="f1", video_title=None,
            request_deadline=time.monotonic() + 30,
            cancel_event=cancel_event,
        )
        # Loop breaks on a pre-set cancel_event rather than raising itself;
        # the route checks cancel_event.is_set() right after the call.
        self.assertFalse(result.success)


class MutePostprocessingTests(unittest.TestCase):
    """docs/OPTIMIZATIONS.md Finding 11: the mute-strip FFmpeg pass was extracted
    into apply_mute_postprocessing(). Only exercised as a fallback now that
    Finding 2 makes YouTube select a video-only format up front, but non-
    YouTube muxed-only sources still take this path.
    """

    def _load(self, run_result):
        namespace = {
            "logger": _Logger(),
            "os": os,
            "subprocess": type("subprocess", (), {
                "run": staticmethod(lambda *a, **k: run_result),
            }),
            "FFMPEG_PATH": "ffmpeg",
            "FFMPEG_DIR": "/usr/bin",
            "FFMPEG_LOCAL_PROTOCOLS": "file",
            "FFMPEG_TIMEOUT": 30,
            "_register_cleanup": lambda path: None,
            "_unregister_cleanup": lambda path: None,
            "_redact_log_text": lambda value: str(value),
            "_log_cleanup_failure": lambda action, exc: None,
        }
        return load_function("apply_mute_postprocessing", namespace)

    def test_successful_strip_renames_muted_output_over_original(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            full_path = str(Path(temp_dir, "clip.mp4"))
            Path(full_path).write_bytes(b"ORIGINAL")
            muted_path = str(Path(temp_dir, "clip.muted.mp4"))

            class _Result:
                returncode = 0
                stderr = ""

            def fake_run(*a, **k):
                Path(muted_path).write_bytes(b"MUTED")
                return _Result()

            fn = self._load(None)
            fn.__globals__["subprocess"].run = staticmethod(fake_run)
            fn(full_path)
            self.assertEqual(Path(full_path).read_bytes(), b"MUTED")
            self.assertFalse(Path(muted_path).exists())

    def test_ffmpeg_failure_raises_and_leaves_original_untouched(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            full_path = str(Path(temp_dir, "clip.mp4"))
            Path(full_path).write_bytes(b"ORIGINAL")

            class _Result:
                returncode = 1
                stderr = "boom"

            fn = self._load(None)
            fn.__globals__["subprocess"].run = staticmethod(lambda *a, **k: _Result())
            with self.assertRaises(RuntimeError):
                fn(full_path)
            self.assertEqual(Path(full_path).read_bytes(), b"ORIGINAL")


class JobFinalizerTests(unittest.TestCase):
    """docs/OPTIMIZATIONS.md Finding 11: the success/too-large decision, progress
    emit, slot release, and native-transfer handoff were extracted into
    finalize_prepared_download(). Repeated calls with the same state must
    return the cached result. release_slot must fire exactly once, and
    only on the success path -- the too-large path leaves it to the route's
    own `finally` fallback, matching the pre-extraction behavior.
    """

    def _load(self, *, max_size):
        calls = {"discard": 0, "release_slot": 0, "prepared": None}

        namespace = {
            "os": os,
            "logger": _Logger(),
            "emit_job_progress": lambda sid, download_id, payload: namespace["safe_emit"](
                "progress", dict(payload, download_id=download_id), room=sid
            ),
            "MAX_DOWNLOAD_SIZE_BYTES": max_size,
            "discard_cancel_event": lambda download_id: calls.__setitem__("discard", calls["discard"] + 1),
            "safe_emit": lambda event, data, room=None: None,
            "sanitize_filename": lambda name: name,
            "safe_download_name": lambda requested, fallback, ext: requested or f"{fallback}.{ext}",
            "prepare_native_download": lambda path, name, ip, reservation_id: calls.__setitem__("prepared", (path, name, ip, reservation_id)) or "TOKEN123",
            "jsonify": lambda payload: payload,
            "PREPARED_FILE_TTL": 600,
            "_unregister_cleanup": lambda path: None,
        }
        fn = load_function("finalize_prepared_download", namespace)
        return fn, calls

    def test_oversized_file_is_rejected_without_releasing_the_slot(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            full_path = str(Path(temp_dir, "big.mp4"))
            Path(full_path).write_bytes(b"x" * 100)
            fn, calls = self._load(max_size=10)
            released = []
            state = {"lock": threading.Lock()}
            (payload, status), reservation_consumed = fn(
                full_path, fmt="mp4", video_title="T", requested_download_name=None,
                ip="1.2.3.4", spool_reservation_id="res1", sid=None, download_id="d1",
                release_slot=lambda: released.append(1),
                state=state,
            )
            self.assertEqual(status, 400)
            self.assertEqual(payload["error_code"], "file_too_large")
            self.assertFalse(reservation_consumed)
            self.assertEqual(released, [])
            self.assertEqual(calls["discard"], 1)

    def test_empty_file_is_rejected_before_handoff(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            full_path = str(Path(temp_dir, "empty.mp4"))
            Path(full_path).write_bytes(b"")
            fn, calls = self._load(max_size=1000)
            released = []
            (payload, status), reservation_consumed = fn(
                full_path, fmt="mp4", video_title="T", requested_download_name=None,
                ip="1.2.3.4", spool_reservation_id="res1", sid=None, download_id="d1",
                release_slot=lambda: released.append(1),
                state={"lock": threading.Lock()},
            )

            self.assertEqual(status, 500)
            self.assertEqual(payload["error_code"], "request_failed")
            self.assertFalse(reservation_consumed)
            self.assertEqual(released, [])
            self.assertIsNone(calls["prepared"])
            self.assertEqual(calls["discard"], 1)
            self.assertFalse(Path(full_path).exists())

    def test_successful_file_releases_slot_once_and_hands_off_token(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            full_path = str(Path(temp_dir, "clip.mp4"))
            Path(full_path).write_bytes(b"x" * 10)
            fn, calls = self._load(max_size=1000)
            released = []
            state = {"lock": threading.Lock()}
            first = fn(
                full_path, fmt="mp4", video_title="My Title", requested_download_name=None,
                ip="1.2.3.4", spool_reservation_id="res1", sid=None, download_id="d1",
                release_slot=lambda: released.append(1),
                state=state,
            )
            second = fn(
                full_path, fmt="mp4", video_title="My Title", requested_download_name=None,
                ip="1.2.3.4", spool_reservation_id="res1", sid=None, download_id="d1",
                release_slot=lambda: released.append(1),
                state=state,
            )
            (payload, status), reservation_consumed = first
            self.assertIs(second, first)
            self.assertEqual(status, 200)
            self.assertTrue(payload["ok"])
            self.assertEqual(payload["download_url"], "/files/TOKEN123")
            self.assertTrue(reservation_consumed)
            self.assertEqual(released, [1])
            self.assertEqual(calls["prepared"], (full_path, calls["prepared"][1], "1.2.3.4", "res1"))
            self.assertEqual(calls["discard"], 1)

    def test_retry_after_prepare_failure_does_not_release_slot_twice(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            full_path = str(Path(temp_dir, "clip.mp4"))
            Path(full_path).write_bytes(b"x" * 10)
            fn, calls = self._load(max_size=1000)
            released = []
            attempts = []

            def flaky_prepare(path, name, ip, reservation_id):
                attempts.append((path, name, ip, reservation_id))
                if len(attempts) == 1:
                    raise RuntimeError("temporary handoff failure")
                calls["prepared"] = attempts[-1]
                return "TOKEN123"

            fn.__globals__["prepare_native_download"] = flaky_prepare
            state = {"lock": threading.Lock()}
            kwargs = {
                "fmt": "mp4",
                "video_title": "My Title",
                "requested_download_name": None,
                "ip": "1.2.3.4",
                "spool_reservation_id": "res1",
                "sid": None,
                "download_id": "d1",
                "release_slot": lambda: released.append(1),
                "state": state,
            }
            with self.assertRaisesRegex(RuntimeError, "temporary handoff failure"):
                fn(full_path, **kwargs)

            (payload, status), reservation_consumed = fn(full_path, **kwargs)
            self.assertEqual(status, 200)
            self.assertTrue(payload["ok"])
            self.assertTrue(reservation_consumed)
            self.assertEqual(released, [1])
            self.assertEqual(len(attempts), 2)
            self.assertEqual(calls["discard"], 1)

    def test_done_progress_is_emitted_only_after_handoff_is_prepared(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            full_path = str(Path(temp_dir, "clip.mp4"))
            Path(full_path).write_bytes(b"x" * 10)
            fn, calls = self._load(max_size=1000)
            events = []

            fn.__globals__["prepare_native_download"] = (
                lambda path, name, ip, reservation_id: events.append("prepared") or "TOKEN123"
            )
            fn.__globals__["safe_emit"] = (
                lambda event, data, room=None: events.append(data.get("status"))
            )
            fn(
                full_path, fmt="mp4", video_title="T", requested_download_name=None,
                ip="1.2.3.4", spool_reservation_id="res1", sid="sid1", download_id="d1",
                release_slot=lambda: None, state={"lock": threading.Lock()},
            )

            self.assertEqual(events, ["prepared", "done"])


if __name__ == "__main__":
    unittest.main()
