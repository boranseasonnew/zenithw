"""Focused regression checks for ZenithW's HTTP security boundaries.

These tests only extract small functions or inspect source; they never import
the production app, start background threads, or contact external services.
"""

import ast
import hashlib
import ipaddress
import hmac
import os
import re
import threading
import time
import unittest
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import urlparse


APP_PATH = Path(__file__).resolve().parents[1] / "app.py"
APP_SOURCE = APP_PATH.read_text(encoding="utf-8")
APP_TREE = ast.parse(APP_SOURCE, filename=str(APP_PATH))


def load_function(name, namespace):
    node = next(
        item for item in APP_TREE.body
        if isinstance(item, ast.FunctionDef) and item.name == name
    )
    # Route decorators belong to Flask, not the isolated function under test.
    import copy
    node = copy.deepcopy(node)
    node.decorator_list = []
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


class OriginLockTests(unittest.TestCase):
    def test_production_cannot_enable_development_key_or_cors_overrides(self):
        self.assertNotIn('ALLOW_INSECURE_KEY', APP_SOURCE)
        self.assertNotIn('ALLOW_DEV_CORS', APP_SOURCE)
        self.assertIn('if os.environ.get("FLASK_ENV") == "development":', APP_SOURCE)
        self.assertIn('SECRET_KEY.startswith("replace-with-")', APP_SOURCE)
        self.assertIn('ORIGIN_SECRET_VALUE.startswith("replace-with-")', APP_SOURCE)

    def test_missing_secret_is_allowed_only_by_an_explicit_development_override(self):
        self.assertIn('ORIGIN_LOCK_DEV_BYPASS = (', APP_SOURCE)
        self.assertIn('os.environ.get("FLASK_ENV") == "development"', APP_SOURCE)
        self.assertIn('_env_flag("ALLOW_INSECURE_ORIGIN_LOCK")', APP_SOURCE)
        self.assertIn('raise RuntimeError(', APP_SOURCE)
        self.assertIn('elif not ORIGIN_LOCK_DEV_BYPASS:', function_source("_enforce_cloudflare_origin"))


class SocketAndSsrfBoundaryTests(unittest.TestCase):
    def test_progress_sid_is_bound_to_the_request_owner_ip(self):
        source = function_source("validate_sid")
        self.assertIn('hmac.compare_digest(entry["ip"], owner_ip)', source)
        self.assertIn('validate_sid(dl_request["sid"], ip)', function_source("download"))

    def test_ipv4_mapped_loopback_is_private(self):
        private_ip = load_function("_is_private_ip", {"ipaddress": ipaddress})
        self.assertTrue(private_ip("::ffff:127.0.0.1"))
        self.assertTrue(private_ip("::ffff:169.254.169.254"))
        self.assertFalse(private_ip("::ffff:8.8.8.8"))

    def test_redirect_hops_stay_on_the_guarded_socket_boundary(self):
        source = function_source("_guarded_create_connection")
        self.assertIn('_resolve_safe_host_cached(', source)
        self.assertIn('_orig_create_connection((safe_ip, port)', source)


class TokenLoggingTests(unittest.TestCase):
    def test_origin_lock_logs_use_token_redaction(self):
        source = function_source("_enforce_cloudflare_origin")
        self.assertNotIn("{request.path}", source)
        self.assertIn('_safe_log_url("https://api.zenithw.space" + request.path)', source)

    def test_prepared_file_token_is_redacted_from_logged_urls(self):
        safe_log_url = load_function(
            "_safe_log_url",
            {"urlparse": urlparse, "hashlib": hashlib, "re": re},
        )
        token = "A" * 43
        value = safe_log_url(f"https://api.zenithw.space/files/{token}/status?x=1")
        self.assertNotIn(token, value)
        self.assertIn("/files/[redacted]/status", value)


class OutboundSecurityTests(unittest.TestCase):
    def test_non_public_and_mapped_addresses_are_rejected(self):
        is_private = load_function("_is_private_ip", {"ipaddress": ipaddress})
        for address in ("100.64.0.1", "100.127.255.254", "::ffff:100.64.0.1",
                        "127.0.0.1", "169.254.169.254", "fc00::1", "fe80::1",
                        "224.0.0.1", "::", "0.0.0.0"):
            with self.subTest(address=address):
                self.assertTrue(is_private(address))
        for address in ("8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"):
            self.assertFalse(is_private(address))

    def test_configured_ffmpeg_keeps_input_protocol_guard(self):
        namespace = {
            "FFMPEG_LOCAL_PROTOCOLS": "file,pipe,crypto,data",
            "YOUTUBE_USER_AGENT": "youtube", "DEFAULT_USER_AGENT": "test",
            "YTDLP_CACHE_DIR": False, "POT_PROVIDER_URL": "",
            "FFMPEG_THREADS": 2, "COOKIES_FILE": "unused", "os": os,
            "is_youtube": lambda url: False, "is_pornhub": lambda url: False,
        }
        opts_fn = load_function("get_base_opts", namespace)
        for directory in (None, "/usr/bin"):
            namespace["FFMPEG_DIR"] = directory
            opts = opts_fn("https://example.com/video", use_cookies=False)
            self.assertEqual(opts["postprocessor_args"]["ffmpeg_i"],
                             ["-protocol_whitelist", "file,pipe,crypto,data"])
            if directory:
                self.assertEqual(opts["postprocessor_args"]["ffmpeg"], ["-threads", "2"])

    def test_native_and_unknown_handlers_cannot_enter_request_director(self):
        source = (APP_PATH.parent / "safe_ytdlp.py").read_text(encoding="utf-8")
        tree = ast.parse(source)
        node = next(node for node in tree.body if isinstance(node, ast.ClassDef))

        class Base:
            def build_request_director(self, handlers, preferences=None):
                return list(handlers)

        namespace = {"YoutubeDL": Base}
        exec(compile(ast.Module(body=[node], type_ignores=[]), "safe_ytdlp.py", "exec"), namespace)
        handlers = [SimpleNamespace(RH_KEY=key) for key in
                    ("Urllib", "Requests", "Websockets", "CurlCFFI", "UnknownNative")]
        selected = namespace["SafeYoutubeDL"]().build_request_director(handlers)
        self.assertEqual([handler.RH_KEY for handler in selected], ["Urllib", "Requests", "Websockets"])
        self.assertNotIn("yt_dlp.YoutubeDL(", APP_SOURCE)


class MalformedRequestTests(unittest.TestCase):
    def test_invalid_json_shapes_rejected_before_network_or_job_work(self):
        limiter = SimpleNamespace(add=lambda ip: True)
        for name in ("get_info", "download_thumbnail", "cancel_route"):
            for body in (["url"], "url", 7, None):
                with self.subTest(route=name, body=body):
                    namespace = {"request": SimpleNamespace(
                                     get_json=lambda silent=True, body=body: body,
                                 ),
                                 "get_client_ip": lambda: "8.8.8.8",
                                 "jsonify": lambda payload: payload,
                                 "info_rate_limiter": limiter,
                                 "thumbnail_rate_limiter": limiter,
                                 "cancel_rate_limiter": limiter}
                    result = load_function(name, namespace)()
                    self.assertEqual(result[1], 400)

    def test_non_string_urls_are_rejected(self):
        limiter = SimpleNamespace(add=lambda ip: True)
        for name in ("get_info", "download_thumbnail"):
            for url in (None, 1, [], {}):
                namespace = {"request": SimpleNamespace(
                                 get_json=lambda silent=True, url=url: {"url": url},
                             ),
                             "get_client_ip": lambda: "8.8.8.8",
                             "jsonify": lambda payload: payload,
                             "info_rate_limiter": limiter, "thumbnail_rate_limiter": limiter}
                self.assertEqual(load_function(name, namespace)()[1], 400)
        namespace["request"].get_json = lambda silent=True: {
            "url": "https://example.com", "thumbnail_url": {},
        }
        self.assertEqual(load_function("download_thumbnail", namespace)()[1], 400)

    def test_json_routes_parse_silently_for_consistent_api_errors(self):
        for name in ("get_info", "download_thumbnail", "cancel_route", "download"):
            source = function_source(name)
            self.assertIn("request.get_json(silent=True)", source)
            self.assertNotIn("request.json", source)

    def test_sid_must_be_a_string_owned_by_request_ip(self):
        namespace = {"hmac": hmac, "time": time, "CONNECTED_SID_MAX_AGE": 3600,
                     "connected_sids_lock": threading.Lock(),
                     "connected_sids": {"known": {"ip": "8.8.8.8", "last_seen": time.time()}}}
        validate = load_function("validate_sid", namespace)
        for sid in ([], {"x": 1}, 123, "x" * 129):
            self.assertEqual(validate(sid, "8.8.8.8"), "")
        self.assertEqual(validate("known", "1.1.1.1"), "")
        self.assertEqual(validate("known", "8.8.8.8"), "known")


if __name__ == "__main__":
    unittest.main()
