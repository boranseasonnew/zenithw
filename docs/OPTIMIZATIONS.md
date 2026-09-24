# Security review — 2026-09-08

Scope: repository review of outbound networking, FFmpeg option construction,
JSON request validation, origin authentication, prepared-file ownership,
Socket.IO progress ownership, and frontend dynamic HTML sinks. This is not a
penetration test or certification of the deployed service.

## Addressed findings

### High: native curl connections bypassed the Python SSRF guard

`curl_cffi` performs networking through libcurl, not Python's patched socket
methods. Validating an initial URL does not protect subsequent extractor
requests, redirects, or a second DNS lookup performed in the native library.
The earlier comment claiming metadata-only impersonation preserved this
boundary was incorrect.

All three yt-dlp entry points now instantiate `SafeYoutubeDL`, which admits
only the audited Python socket handlers (Urllib, Requests, Websockets).
Native curl and unknown handlers are excluded from the request director,
including extractor-requested impersonation and fallback selection.

Compatibility impact: sources requiring browser impersonation, including some
Pornhub requests, may now fail. This does not remove a platform from the URL
allowlist. Restoring native impersonation requires an independently enforced
egress boundary or a validated native connection guard; simply reinstalling
curl-cffi must not reopen the bypass.

Verified against installed yt-dlp 2026.08.19 and curl-cffi 0.16.3: the default
registry contained CurlCFFI, while the application's director excluded it.
Reference: [pinned yt-dlp curl handler](https://github.com/yt-dlp/yt-dlp/blob/2026.08.19/yt_dlp/networking/_curlcffi.py).

### High: FFmpeg input protocol restrictions were overwritten

When FFmpeg was configured, `get_base_opts` replaced the entire postprocessor
argument dictionary with the encoder thread limit. This discarded the input
protocol whitelist and could allow a downloaded input referencing other
resources to trigger network access outside the Python socket guard.

Thread arguments are now merged into the existing dictionary, retaining
`ffmpeg_i: -protocol_whitelist file,pipe,crypto,data`. Tests evaluate the actual
returned options both with and without a configured FFmpeg directory.

### Medium: non-public shared address space was accepted

`is_private` is false for shared address space such as `100.64.0.0/10`.
The address check now rejects non-global addresses as well as multicast,
reserved and unspecified addresses. IPv4-mapped IPv6 is normalized first.
The narrowly scoped configured PO-token-provider exception is unchanged.

### Low: malformed client input caused unhandled exceptions

Non-object JSON and non-string URL fields could raise AttributeError in
`/info`, `/thumbnail`, and `/cancel`. Non-string Socket.IO IDs and unhashable
SponsorBlock category values could cause TypeError during download handling.

Malformed request shapes now return 400; invalid progress IDs are ignored;
invalid category entries are filtered before set membership is tested.
These changes prevent avoidable 500 responses; they are not a claim that
distributed denial-of-service is solved.

## Existing protections reviewed

- Origin lock already fails startup when its secret is missing, except for
  the explicit development override.
- Prepared-file transfer/status and cancellation check the request owner's IP.
- Progress IDs already check the connection owner's IP; this patch adds type
  validation before dictionary lookup.
- Frontend metadata interpolation uses escaping; uploaded filenames use
  `textContent`. No new DOM-XSS finding was established in the inspected sinks.

## Verification and remaining limits

- Offline regression suite: run from `backend` with
  `python -m unittest discover -s tests`.
- Added negative cases for shared/private/mapped addresses, malformed JSON and
  SID values, plus option construction and handler selection checks.
- No production requests, deployment, Git push, account settings, cookies or
  origin credentials were changed during this review.
- Actual Nginx/Cloudflare header trust and AWS network policy were not verified
  live. Repository settings alone do not prove the production configuration.
- FFmpeg still needs local file access; a protocol whitelist is not a complete
  filesystem sandbox against every malicious media/manifest input.
- Installed production dependencies and FFmpeg binaries were not audited for
  all published CVEs. Real-media provider compatibility remains to be tested
  in staging before deploying the network-policy change.

## AWS stability follow-up — 2026-09-18

This pass reviewed the current single-worker EC2 backend and its local
regression suite. It did not modify Railway settings or claim that the local
changes are already deployed to AWS.

### Addressed: readiness double-counted prepared spool files

`spool_snapshot()["reserved_bytes"]` already contains both active and prepared
reservations. `/ready` added `prepared_bytes` a second time, so a large file
waiting for browser transfer could make a healthy worker return 503 while the
configured spool limit had not actually been reached. Readiness now compares
the total reservation value once.

### Addressed: failed thumbnail attempts left token-scoped artifacts

The thumbnail retry loop reaped child processes but did not remove partial,
source, or converted images left by a failed profile. Each failed attempt now
cleans its internal token namespace, and a successful attempt keeps only the
authoritative file that is streamed to the client.

### Addressed: malformed JSON could escape the API error contract

Flask 3.1 can raise its own 400/415 response while accessing `request.json`.
The JSON routes now use silent parsing and return the application's consistent
JSON validation errors for missing content types and malformed request bodies.

### Verification and remaining limits

- Offline backend regression suite: 115 tests passed.
- Python bytecode compilation passed for the backend modules and tests.
- The available local Python installation does not contain the production
  dependencies (`flask_cors` was missing), so a full application import and
  Flask test-client smoke run could not be completed in this checkout.
- No AWS service, environment file, cookie, Cloudflare setting, Git commit, or
  deployment was changed. Live EC2 verification remains required after deploy.
