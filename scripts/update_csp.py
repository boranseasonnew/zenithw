#!/usr/bin/env python3
"""Generate the static-host CSP hashes from the checked-in HTML files."""

from __future__ import annotations

import argparse
import base64
import hashlib
import html
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"
HEADERS = FRONTEND / "_headers"
SCRIPT_RE = re.compile(r"<script(?P<attrs>[^>]*)>(?P<body>.*?)</script\s*>", re.I | re.S)
HANDLER_RE = re.compile(r"\son[a-z][a-z0-9_-]*\s*=\s*([\"'])(.*?)\1", re.I | re.S)
CSP_RE = re.compile(r"^(?P<indent>\s*)Content-Security-Policy:.*$", re.M)


def csp_hash(value: str) -> str:
    digest = hashlib.sha256(value.encode("utf-8")).digest()
    return "'sha256-" + base64.b64encode(digest).decode("ascii") + "'"


def collect_hashes() -> tuple[list[str], list[str]]:
    scripts: set[str] = set()
    handlers: set[str] = set()
    for path in sorted(FRONTEND.glob("*.html")):
        source = path.read_text(encoding="utf-8")
        for match in SCRIPT_RE.finditer(source):
            if re.search(r"\bsrc\s*=", match.group("attrs"), re.I):
                continue
            body = match.group("body")
            if body.strip():
                scripts.add(csp_hash(body))
        for match in HANDLER_RE.finditer(source):
            handlers.add(csp_hash(html.unescape(match.group(2))))
    return sorted(scripts), sorted(handlers)


def build_policy() -> str:
    script_hashes, handler_hashes = collect_hashes()
    allowed_inline = " ".join(script_hashes + handler_hashes)
    directives = [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        (
            "script-src 'self' 'unsafe-hashes' https://cdnjs.cloudflare.com "
            + allowed_inline
        ).rstrip(),
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self'",
        "img-src 'self' data: blob: https:",
        "media-src 'self' blob:",
        "connect-src 'self' https://api.zenithw.space wss://api.zenithw.space",
        "worker-src 'self' blob:",
        "manifest-src 'self'",
        "upgrade-insecure-requests",
    ]
    return "; ".join(directives)


def render_headers() -> tuple[str, str]:
    current = HEADERS.read_text(encoding="utf-8")
    expected = CSP_RE.sub(
        lambda match: f"{match.group('indent')}Content-Security-Policy: {build_policy()}",
        current,
        count=1,
    )
    return current, expected


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    current, expected = render_headers()
    if args.check:
        if current != expected:
            print("frontend/_headers CSP hashes are stale; run scripts/update_csp.py")
            return 1
        print("frontend/_headers CSP hashes are current")
        return 0
    HEADERS.write_text(expected, encoding="utf-8", newline="\n")
    script_hashes, handler_hashes = collect_hashes()
    print(f"Updated CSP with {len(script_hashes)} inline-script and {len(handler_hashes)} handler hashes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
