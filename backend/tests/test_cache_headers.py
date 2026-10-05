"""Verify API cache protection without starting workers or contacting providers."""
import ast
import unittest
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[2]
APP_PATH = ROOT / "backend/app.py"

class ApiCacheHeadersTests(unittest.TestCase):
    def setUp(self):
        tree = ast.parse(APP_PATH.read_text(encoding="utf-8"))
        node = next(item for item in tree.body if isinstance(item, ast.FunctionDef)
                    and item.name == "prevent_api_indexing")
        node.decorator_list = []
        namespace = {}
        exec(compile(ast.Module(body=[node], type_ignores=[]), str(APP_PATH), "exec"), namespace)
        self.apply_headers = namespace["prevent_api_indexing"]

    def test_success_errors_and_token_transfers_never_enter_browser_or_cdn_cache(self):
        for status in (200, 204, 206, 304, 400, 403, 404, 410, 429, 500, 503):
            with self.subTest(status=status):
                response = SimpleNamespace(status_code=status, headers={
                    "Cache-Control": "public, max-age=31536000",
                    "CDN-Cache-Control": "public, max-age=31536000",
                    "Cloudflare-CDN-Cache-Control": "public, max-age=31536000",
                    "Expires": "Wed, 21 Oct 2037 07:28:00 GMT",
                    "Content-Disposition": 'attachment; filename="media.mp4"',
                    "Content-Length": "123",
                })
                self.assertIs(self.apply_headers(response), response)
                self.assertEqual(response.status_code, status)
                self.assertEqual(response.headers["Cache-Control"], "private, no-store, max-age=0")
                self.assertEqual(response.headers["CDN-Cache-Control"], "no-store")
                self.assertEqual(response.headers["Cloudflare-CDN-Cache-Control"], "no-store")
                self.assertNotIn("Expires", response.headers)
                self.assertEqual(response.headers["Content-Length"], "123")
                self.assertIn('filename="media.mp4"', response.headers["Content-Disposition"])

    def test_both_proxy_configs_protect_socket_and_api_responses(self):
        for file in ("backend/deploy/nginx/zenithw.conf", "docker/nginx/default.conf"):
            source = (ROOT / file).read_text(encoding="utf-8")
            for header in ("Cache-Control", "CDN-Cache-Control", "Cloudflare-CDN-Cache-Control"):
                self.assertIn("proxy_hide_header " + header + ";", source, file)
                self.assertIn("add_header " + header, source, file)
            self.assertIn("private, no-store, max-age=0", source, file)
            self.assertIn("always;", source, file)

if __name__ == "__main__":
    unittest.main()
