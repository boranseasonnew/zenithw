"""Native HTTP guard contracts; provider success is checked separately on EC2."""
import socket
import subprocess
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from curl_cffi import CurlOpt
from curl_cffi.requests import Session
from yt_dlp.networking.exceptions import RequestError
from native_http import PublicSession, public_destination
from safe_ytdlp import SafeYoutubeDL


def answers(*addresses):
    return [(socket.AF_INET6 if ":" in ip else socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, 443)) for ip in addresses]


class NativeHttpTests(unittest.TestCase):
    def test_non_public_literals_and_ambiguous_authorities_are_blocked(self):
        for url in ("http://127.0.0.1/", "http://169.254.169.254/latest/meta-data/", "http://10.0.0.1/",
                    "http://100.64.0.1/", "http://224.0.0.1/", "http://[::1]/", "http://[::ffff:127.0.0.1]/", "http://[2002:7f00:1::]/",
                    "http://2130706433/", "http://0177.0.0.1/", "http://127.1/", "http://user:pass@example.test/",
                    "file:///etc/passwd", "https://example.test\\@127.0.0.1/", "http://example.test\r/", "http://[fe80::1%25eth0]/"):
            with self.subTest(url=url), self.assertRaises(RequestError):
                public_destination(url)

    def test_mixed_public_private_dns_fails_closed(self):
        with patch("native_http.socket.getaddrinfo", return_value=answers("8.8.8.8", "127.0.0.1")):
            with self.assertRaises(RequestError):
                public_destination("https://public.example.test/")

    def test_native_transfer_is_pinned_and_cannot_follow_or_proxy(self):
        seen = []
        def send(session, method, url, **kwargs):
            seen.append((url, dict(session.curl_options), kwargs))
            return SimpleNamespace(status_code=200, headers={}, url=url, reason="OK", close=lambda: None)
        with patch("native_http.socket.getaddrinfo", return_value=answers("8.8.8.8")) as resolver, patch.object(Session, "request", send):
            with PublicSession() as session:
                session.request("GET", "https://EXAMPLE.test./video?x=1", stream=True, allow_redirects=True, max_redirects=999)
        url, options, kwargs = seen[0]
        self.assertEqual(url, "https://example.test:443/video?x=1")
        self.assertEqual(options[CurlOpt.RESOLVE], [b"example.test:443:8.8.8.8"])
        self.assertEqual(options[CurlOpt.PROXY], "")
        self.assertEqual(options[CurlOpt.FOLLOWLOCATION], 0)
        self.assertEqual(options[CurlOpt.FRESH_CONNECT], 1)
        self.assertEqual(options[CurlOpt.FORBID_REUSE], 1)
        self.assertEqual(options[CurlOpt.PROTOCOLS_STR], "http,https")
        self.assertTrue(kwargs["verify"])
        self.assertFalse(kwargs["allow_redirects"])
        self.assertEqual(resolver.call_count, 1)

    def test_private_redirect_is_blocked_before_second_transfer(self):
        seen, closed = [], []
        def send(session, method, url, **kwargs):
            seen.append(url)
            return SimpleNamespace(status_code=302, headers={"Location": "http://169.254.169.254/latest/meta-data/"}, url=url, reason="Found", close=lambda: closed.append(True))
        with patch("native_http.socket.getaddrinfo", return_value=answers("8.8.8.8")), patch.object(Session, "request", send):
            with PublicSession() as session, self.assertRaises(RequestError):
                session.request("GET", "http://example.test/")
        self.assertEqual(len(seen), 1)
        self.assertEqual(closed, [True])

    def test_rebinding_on_same_origin_redirect_is_blocked(self):
        response = SimpleNamespace(status_code=302, headers={"Location": "/next"}, url="https://example.test/", reason="Found", close=lambda: None)
        with patch("native_http.socket.getaddrinfo", side_effect=[answers("8.8.8.8"), answers("127.0.0.1")]), patch.object(Session, "request", return_value=response) as send:
            with PublicSession() as session, self.assertRaises(RequestError):
                session.request("GET", "https://example.test/")
        self.assertEqual(send.call_count, 1)

    def test_redirect_drops_origin_credentials_and_has_finite_budget(self):
        seen = []
        def send(session, method, url, **kwargs):
            seen.append(kwargs["headers"])
            return SimpleNamespace(status_code=302, headers={"Location": "https://other.example.test/"}, url=url, reason="Found", close=lambda: None)
        with patch("native_http.socket.getaddrinfo", return_value=answers("8.8.8.8")), patch.object(Session, "request", send):
            with PublicSession() as session, self.assertRaises(RequestError):
                session.request("GET", "https://example.test/", headers={"Authorization": "secret", "Cookie": "session=secret", "Accept": "text/html"})
        self.assertEqual(seen[1], {"Accept": "text/html"})
        self.assertEqual(len(seen), 6)

    def test_routing_overrides_are_rejected(self):
        for key in ("proxy", "proxies", "curl_options", "doh_url", "dns", "params", "auth"):
            with self.subTest(key=key), PublicSession() as session, self.assertRaises(RequestError):
                session.request("GET", "https://example.test/", **{key: "override"})

    def test_native_body_limit_aborts_before_buffer_growth(self):
        def send(session, method, url, **kwargs):
            self.assertEqual(kwargs["content_callback"](b"x" * 1025), 0)
            raise OSError("native write aborted")
        with patch("native_http.MAX_NATIVE_BODY", 1024), patch("native_http.socket.getaddrinfo", return_value=answers("8.8.8.8")), patch.object(Session, "request", send):
            with PublicSession() as session, self.assertRaises(RequestError):
                session.request("GET", "https://example.test/")

    def test_redirect_cookie_updates_and_deletions_preserve_original_jar(self):
        seen = []
        def send(session, method, url, **kwargs):
            seen.append(session.cookies.get("sid"))
            if len(seen) == 1:
                session.cookies.set("sid", "fixture", domain="example.test", path="/")
                return SimpleNamespace(status_code=302, headers={"Location": "/next"}, url=url, reason="Found", close=lambda: None)
            session.cookies.delete("sid", domain="example.test", path="/")
            return SimpleNamespace(status_code=200, headers={}, url=url, reason="OK", close=lambda: None)
        with patch("native_http.socket.getaddrinfo", return_value=answers("8.8.8.8")), patch.object(Session, "request", send):
            with PublicSession() as session:
                jar = session.cookies.jar
                session.request("GET", "https://example.test/")
                self.assertIs(session.cookies.jar, jar)
                self.assertIsNone(session.cookies.get("sid"))
        self.assertEqual(seen, [None, "fixture"])

    def test_monkey_patched_runtime_remains_responsive_and_cancellable(self):
        scenario = Path(__file__).with_name("native_gevent_scenario.py")
        result = subprocess.run([sys.executable, str(scenario)], capture_output=True, text=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_unmodified_native_handler_is_never_selected(self):
        with SafeYoutubeDL({"quiet": True}) as ydl:
            self.assertNotIn("CurlCFFI", ydl._request_director.handlers)
        with SafeYoutubeDL({"quiet": True, "zenith_public_impersonation": True}) as ydl:
            handler = ydl._request_director.handlers["CurlCFFI"]
            with handler._create_instance() as session:
                self.assertIsInstance(session, PublicSession)
                self.assertFalse(session.trust_env)

    def test_actual_native_session_never_contacts_loopback_listener(self):
        with socket.socket() as server:
            server.bind(("127.0.0.1", 0))
            server.listen()
            server.settimeout(0.05)
            with PublicSession() as session, self.assertRaises(RequestError):
                session.request("GET", f"http://127.0.0.1:{server.getsockname()[1]}/")
            with self.assertRaises(socket.timeout):
                server.accept()
