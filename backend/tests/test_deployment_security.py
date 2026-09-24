import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class DeploymentSecurityTests(unittest.TestCase):
    def test_nginx_limits_socket_handshakes_and_emits_security_headers(self):
        source = (ROOT / "backend/deploy/nginx/zenithw.conf").read_text(encoding="utf-8")
        self.assertIn("limit_conn_zone $binary_remote_addr", source)
        self.assertIn("limit_req_zone $binary_remote_addr", source)
        self.assertIn("location /socket.io/", source)
        self.assertIn("limit_conn zenithw_socket_per_ip", source)
        self.assertIn("Strict-Transport-Security", source)
        self.assertIn("X-Content-Type-Options", source)

    def test_systemd_service_drops_capabilities_and_isolates_host_resources(self):
        source = (ROOT / "backend/deploy/systemd/zenithw-backend.service").read_text(
            encoding="utf-8"
        )
        for directive in (
            "PrivateTmp=true",
            "PrivateDevices=true",
            "ProtectKernelTunables=true",
            "ProtectKernelModules=true",
            "ProtectControlGroups=true",
            "NoNewPrivileges=true",
            "CapabilityBoundingSet=",
            "RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6",
        ):
            self.assertIn(directive, source)

    def test_frontend_csp_has_no_blanket_inline_script_permission(self):
        source = (ROOT / "frontend/_headers").read_text(encoding="utf-8")
        csp = next(line.strip() for line in source.splitlines() if "Content-Security-Policy:" in line)
        script_directive = next(
            directive.strip() for directive in csp.split(";") if directive.strip().startswith("script-src ")
        )
        self.assertNotIn("'unsafe-inline'", script_directive)
        self.assertIn("'unsafe-hashes'", script_directive)
        self.assertIn("'sha256-", script_directive)
        self.assertIn("Strict-Transport-Security: max-age=31536000", source)
        self.assertLess(len(csp.encode("utf-8")), 8192)

    def test_geist_font_is_self_hosted_with_its_license(self):
        html = "\n".join(
            path.read_text(encoding="utf-8") for path in sorted((ROOT / "frontend").glob("*.html"))
        )
        self.assertNotIn("fonts.googleapis.com", html)
        self.assertNotIn("fonts.gstatic.com", html)
        self.assertIn('href="/fonts.css?v=1"', html)
        font = (ROOT / "frontend/fonts/GeistMono-Variable.woff2").read_bytes()
        license_text = (ROOT / "frontend/fonts/OFL.txt").read_text(encoding="utf-8")
        self.assertEqual(font[:4], b"wOF2")
        self.assertIn("SIL OPEN FONT LICENSE Version 1.1", license_text)


if __name__ == "__main__":
    unittest.main()
