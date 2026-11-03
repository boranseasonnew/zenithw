# Pornhub native HTTP guard

The EC2 failure was reproduced on 3 November 2026: the default guarded
yt-dlp path returned HTTP 410 for the reported video. A separate diagnostic
with browser impersonation returned formats from the same server. This did
not establish that the entire AWS address was blocked or the video deleted.

`SafeYoutubeDL` still rejects unwrapped native handlers and unknown handlers.
Only Pornhub options explicitly enable a replacement CurlCFFI handler. Its
session checks every DNS answer, rejects non-public and IPv6 transition
addresses, and pins the selected numerical IP through `CURLOPT_RESOLVE`.
Canonical HTTP(S) URLs retain their hostname for TLS verification and SNI.
Proxies, implicit redirects and connection reuse are disabled. Redirects
are bounded and revalidated, including same-host DNS changes; explicit
origin credentials and request bodies cannot leak across origins.

The native handler only processes impersonated metadata/webpage requests.
Responses are capped at 16 MiB and each transfer at 15 seconds. Ordinary
media streams continue through the existing guarded Python handlers.
Large impersonated payloads fail closed rather than buffering a whole video.

Native transfers run in gevent's real OS thread pool after monkey patching.
curl_cffi's streaming executor is deliberately avoided: patched executor
threads can otherwise block the entire API worker. A cancelled caller sets
an abort flag; the transfer thread alone owns/closes its handle and has a
hard timeout even if the server sends nothing. Response bytes are exposed
through a small iterator compatible with yt-dlp's reader.

Tests cover private and metadata IPs, mapped/transition IPv6, mixed DNS,
rebinding, redirects, proxy overrides, origin credentials, size limits,
native handler selection, a real loopback listener, and gevent responsiveness
and cancellation in an isolated interpreter. Provider-specific success must
also be checked on EC2; local metadata success is not proof of full download.

Deployment must preserve the existing EC2 application/environment/cookies.
Stage `safe_ytdlp.py` and `native_http.py` separately, check hashes and run
the tests with the server interpreter before replacing files. Keep a backup,
add only the Pornhub option flag to the existing live engine, then verify
health, metadata and a bounded download. Roll back the changed files on any
failure. A GitHub website push does not deploy the EC2 backend.

## Staged verification — 3 November 2026

- All 148 local backend tests passed, including the 12 native guard tests.
- The same 12 guard tests passed on the existing EC2 Python 3.12,
  yt-dlp 2026.10.21 and curl_cffi 0.16.3 runtime. Staged source SHA-256
  values matched the committed files.
- Real extraction through the new adapter succeeded on EC2 in 1.12 seconds;
  the largest observed heartbeat gap was 0.299 seconds, including extractor
  startup. Format availability varied between requests; this is not a speed
  or format-availability guarantee.
- A real low-quality MP4 download completed in the isolated stage directory.
  ffprobe identified H.264 426x240 video and AAC audio, duration 1361.166667
  seconds, file size 145,290,863 bytes. The initial 80 MiB test was skipped
  by its size cap; the completed check used a 180 MiB cap and resumed after
  the first command's 120-second deadline.
- Existing production app/safe wrapper files were backed up on EC2. A
  staged copy of the live monolithic app adds only one provider option line;
  the live source is not replaced with the repository's modular app tree.
- Production installation/restart is pending the requested deployment
  approval. The existing service remains unchanged at this checkpoint.

References: [libcurl DNS pinning](https://curl.se/libcurl/c/CURLOPT_RESOLVE.html),
[manual redirect handling](https://curl.se/libcurl/c/CURLOPT_FOLLOWLOCATION.html),
[curl_cffi Session API](https://curl-cffi.readthedocs.io/en/latest/api.html),
[gevent native thread pool](https://www.gevent.org/api/gevent.threadpool.html).
