"""Private subprocess scenarios; no media-provider requests are performed."""
from gevent import monkey
monkey.patch_all()

import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import threading
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
for key in ("YOUTUBE_COOKIES", "COOKIES", "YOUTUBE_COOKIE", "YOUTUBE_POT_PROVIDER_URL"):
    os.environ.pop(key, None)
os.environ.update(
    SECRET_KEY="factory-test-secret-long-value", ORIGIN_SECRET="factory-test-origin-long-value",
    ENABLE_ORIGIN_LOCK="0", FLASK_ENV="development", MAINTENANCE_MODE="0",
)
from zenith.factory import create_app
from zenith.security.network import current_policy
from zenith.services import metadata as metadata_module


def app_at(path):
    app = create_app(start_background=False, download_dir=path)
    app.config["TESTING"] = True
    return app, app.extensions["zenith"]


def http_scenario(directory):
    app, runtime = app_at(directory)
    client = app.test_client()
    try:
        fixture = Path(__file__).with_name("fixtures") / "http-contract.json"
        for case in json.loads(fixture.read_text(encoding="utf-8")).values():
            response = getattr(client, case["method"])(case["url"], json=case["input"]) if case["input"] is not None else getattr(client, case["method"])(case["url"])
            assert response.status_code == case["status"], case["url"]
            assert response.get_json(silent=True) == case["json"], case["url"]
            if case["body"] is not None:
                assert response.get_data(as_text=True) == case["body"]
            for key, value in case["headers"].items():
                assert response.headers.get(key) == value, key

        calls = []

        class FakeExtractor:
            def __init__(self, opts):
                self.opts = opts
            def __enter__(self):
                return self
            def __exit__(self, *args):
                return False
            def extract_info(self, url, download=False):
                assert download is False
                calls.append(url)
                return {"id": "fixture", "title": "Service wiring", "duration": 6, "formats": [
                    {"format_id": "720", "vcodec": "h264", "acodec": "aac", "ext": "mp4", "height": 720,
                     "width": 1280, "filesize": 2048, "url": "https://cdn.example.test/video.mp4", "protocol": "https"}
                ]}

        with patch.object(runtime.network, "is_safe_url", return_value=True), patch.object(metadata_module, "SafeYoutubeDL", FakeExtractor):
            for _ in range(2):
                response = client.post("/info", json={"url": "https://example.test/video"})
                assert response.status_code == 200, response.get_json()
                assert response.get_json()["title"] == "Service wiring"
        assert len(calls) == 1, "Repeated metadata must use this app's cache"

        with patch.object(runtime.network, "is_safe_url", return_value=True), patch.object(metadata_module, "SafeYoutubeDL", FakeExtractor):
            for endpoint in ("/info", "/download", "/thumbnail"):
                response = client.post(endpoint, json={"url": "https://open.spotify.com/track/fixture"})
                assert response.status_code == 400, endpoint
                assert response.get_json()["error_code"] == "unsupported_url", endpoint
        assert len(calls) == 1, "Blocked platforms must not reach the extractor"

        class UnsupportedExtractor(FakeExtractor):
            def extract_info(self, url, download=False):
                raise ValueError("Unsupported URL: https://example.test/private?token=secret")

        with patch.object(runtime.network, "is_safe_url", return_value=True), patch.object(metadata_module, "SafeYoutubeDL", UnsupportedExtractor):
            for url in ("https://example.test/unsupported", "https://www.instagram.com/not-a-video"):
                response = client.post("/info", json={"url": url})
                assert response.status_code == 400
                assert response.get_json()["error_code"] == "unsupported_url", response.get_json()
                assert "secret" not in response.get_data(as_text=True)
        assert not runtime.jobs.cancel_events
        assert not runtime._threads
    finally:
        runtime.close()


def isolation_scenario(directory):
    app1, first = app_at(Path(directory) / "one")
    app2, second = app_at(Path(directory) / "two")
    try:
        first.metadata._store_cached_info("fixture", {"title": "first only"})
        assert second.metadata._get_cached_info("fixture") is None
        first.jobs.cancel_events["fixture-id"] = (threading.Event(), "127.0.0.1", 0)
        assert "fixture-id" not in second.jobs.cancel_events
        first.security.rate_limiter.add("owner")
        assert first.security.rate_limiter is not second.security.rate_limiter
        assert first.files._spool_reservations is not second.files._spool_reservations
        assert first.network._ssrf_safe_host_cache is not second.network._ssrf_safe_host_cache
        guard = socket.create_connection
        for app, runtime in ((app1, first), (app2, second)):
            with app.test_request_context("/health"):
                app.preprocess_request()
                assert current_policy() is runtime.network
                try:
                    socket.create_connection(("127.0.0.1", 22))
                except PermissionError:
                    pass
                else:
                    raise AssertionError("Private outbound socket was accepted")
            assert current_policy() is not runtime.network
        assert socket.create_connection is guard, "A new app must not stack socket wrappers"
        connection = first.socketio.test_client(app1)
        assert connection.is_connected()
        assert len(first.jobs.connected_sids) == 1
        assert not second.jobs.connected_sids
        connection.disconnect()
        assert not first.jobs.connected_sids
        first.start_background_tasks()
        workers = list(first._threads)
        first.start_background_tasks()
        assert first._threads == workers
        first.close()
        assert all(not worker.is_alive() for worker in workers)
        with patch.dict(os.environ, {"ENABLE_ORIGIN_LOCK": "1", "FLASK_ENV": "production"}):
            protected, protected_runtime = app_at(Path(directory) / "protected")
            try:
                client = protected.test_client()
                assert client.get("/health").status_code == 204
                assert client.post("/info", json={}).status_code == 404
                response = client.post("/info", json={}, headers={"X-Origin-Verify": "factory-test-origin-long-value"})
                assert response.status_code == 400, response.get_json()
                assert client.get("/debug-headers", headers={"X-Origin-Verify": "factory-test-origin-long-value"}).status_code == 404
                assert not protected_runtime.security.concurrent_ip_counts
            finally:
                protected_runtime.close()
    finally:
        first.close()
        second.close()


def conversion_at(directory, download_dir):
    app, runtime = app_at(download_dir)
    try:
        assert runtime.engine.FFMPEG_PATH, "FFmpeg is required for this integration test"
        source = Path(directory) / "fixture.mp4"
        subprocess.run([
            runtime.engine.FFMPEG_PATH, "-v", "error", "-f", "lavfi", "-i", "testsrc2=size=160x90:rate=15",
            "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=44100", "-t", "1",
            "-c:v", "libx264", "-c:a", "aac", str(source),
        ], check=True, timeout=15)
        client = app.test_client()
        with source.open("rb") as media:
            response = client.post("/convert", data={"file": (media, "fixture.mp4"), "target_format": "mkv", "mode": "remux"})
        payload = response.get_json()
        assert response.status_code == 200, payload
        path = payload["download_url"]
        status = client.get(path + "/status")
        assert status.status_code == 200, status.get_json()
        foreign = client.get(path, environ_overrides={"REMOTE_ADDR": "203.0.113.8"})
        assert foreign.status_code == 404
        downloaded = client.get(path, buffered=True)
        assert downloaded.status_code == 200
        assert downloaded.data[:4] == b"\x1aE\xdf\xa3", "Expected a real Matroska container"
        downloaded.close()
        assert not runtime.files._active_transfer_paths
        assert not runtime.files._spool_reservations
        assert runtime.jobs.active_transfers_count == 0
    finally:
        runtime.close()


def conversion_scenario(directory):
    conversion_at(directory, directory)
    # Production uses a relative ./downloads workspace. A package move must
    # preserve Flask's file root, not accidentally prepend backend/zenith.
    backend = Path(__file__).resolve().parents[1]
    with tempfile.TemporaryDirectory(dir=backend) as relative:
        conversion_at(relative, Path(relative).relative_to(backend))


with tempfile.TemporaryDirectory() as workspace:
    {"http": http_scenario, "isolation": isolation_scenario, "conversion": conversion_scenario}[sys.argv[1]](workspace)
print("PASS", sys.argv[1])
