#!/usr/bin/env python3
"""Notify participating search engines of selected, published public pages.
No network requests occur without --submit. This is not part of the site build.
"""
import argparse
import json
import re
import sys
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
CONFIG = json.loads((ROOT / "scripts/indexnow.json").read_text(encoding="utf-8"))
ORIGIN = "https://zenithw.space"
ENDPOINT = "https://api.indexnow.org/indexnow"
AGENT = "ZenithW-IndexNow/1.0 (+https://zenithw.space/)"
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--submit", action="store_true", help="Verify the live key and send one notification")
parser.add_argument("--path", action="append", help="Changed canonical path; repeat for multiple pages")
args = parser.parse_args()

def fail(message):
    sys.exit(message)

if CONFIG["host"] != "zenithw.space" or not re.fullmatch(r"[a-f0-9]{32}", CONFIG["key"]):
    fail("Invalid public IndexNow configuration.")
expected_key_url = ORIGIN + "/" + CONFIG["key"] + ".txt"
if CONFIG["keyLocation"] != expected_key_url:
    fail("The verification file must be hosted on the canonical domain.")
ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
canonical = {el.text for el in ET.parse(ROOT / "frontend/sitemap.xml").findall(".//s:loc", ns)}
urls = []
for path in args.path or CONFIG["changedPaths"]:
    if not path.startswith("/") or path.startswith("//"):
        fail("Supply a canonical path starting with one slash.")
    url = ORIGIN + path
    parsed = urlsplit(url)
    if parsed.netloc != CONFIG["host"] or parsed.query or parsed.fragment or url not in canonical:
        fail("Only canonical public sitemap URLs without tokens or query strings can be submitted: " + path)
    if url not in urls:
        urls.append(url)
if not 1 <= len(urls) <= 10000:
    fail("IndexNow requires 1 to 10000 URLs.")
payload = {name: CONFIG[name] for name in ("host", "key", "keyLocation")}
payload["urlList"] = urls
if not args.submit:
    print(json.dumps(payload, indent=2))
    print("Preview only. Use --submit after these changes are published.", file=sys.stderr)
    sys.exit(0)

try:
    key_request = Request(expected_key_url, headers={"User-Agent": AGENT})
    with urlopen(key_request, timeout=30) as response:
        if response.status != 200 or response.geturl() != expected_key_url:
            fail("The live verification URL must return 200 without a redirect.")
        if response.read(1024).decode("utf-8").strip() != CONFIG["key"]:
            fail("The published verification file does not contain the expected key.")
    request = Request(ENDPOINT, data=json.dumps(payload).encode("utf-8"),
                      headers={"Content-Type": "application/json; charset=utf-8", "User-Agent": AGENT},
                      method="POST")
    with urlopen(request, timeout=30) as response:
        status = response.status
except HTTPError as exc:
    explanations = {403: "Invalid key or inaccessible verification file.",
                    422: "URLs or key location do not match the host.",
                    429: "Rate limited. Wait before trying again."}
    fail(f"HTTP {exc.code}: " + explanations.get(exc.code, "Submission failed."))
except OSError as exc:
    fail("Network request failed: " + str(exc))
if status not in (200, 202):
    fail(f"Unexpected HTTP response: {status}")
print(f"HTTP {status}: {len(urls)} public URLs received by IndexNow.")
print("202 means key validation is pending. Neither 200 nor 202 guarantees indexing or ranking.")
