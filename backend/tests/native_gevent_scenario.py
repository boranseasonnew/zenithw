"""Isolated process: exercise OS thread offloading after monkey.patch_all()."""
from gevent import monkey
monkey.patch_all()
import gevent
import sys
import time
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from curl_cffi.requests import Session
from native_http import PublicSession

native_sleep = monkey.get_original("time", "sleep")
completed = []
def send(session, method, url, **kwargs):
    native_sleep(0.25)
    try:
        kwargs["content_callback"](b"fixture")
        return SimpleNamespace(status_code=200, headers={}, url=url, reason="OK", close=lambda: None)
    finally:
        completed.append(True)

with patch("native_http.socket.getaddrinfo", return_value=[(2, 1, 6, "", ("8.8.8.8", 443))]), patch.object(Session, "request", send):
    with PublicSession() as session:
        start = time.monotonic()
        job = gevent.spawn(session.request, "GET", "https://example.test/", stream=True)
        gevent.sleep(0.025)
        heartbeat = time.monotonic() - start
        assert heartbeat < 0.15, heartbeat
        assert job.get(timeout=2).content == b"fixture"
    with PublicSession() as session:
        start = time.monotonic()
        try:
            with gevent.Timeout(0.025):
                session.request("GET", "https://example.test/", stream=True)
        except gevent.Timeout:
            pass
        else:
            raise AssertionError("Native wait did not cancel")
        assert time.monotonic() - start < 0.15
        gevent.sleep(0.35)
        assert len(completed) == 2
print("PASS: native transfer leaves gevent responsive; cancellation returns and owned thread finishes")
