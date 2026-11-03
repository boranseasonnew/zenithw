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

References: [libcurl DNS pinning](https://curl.se/libcurl/c/CURLOPT_RESOLVE.html),
[manual redirect handling](https://curl.se/libcurl/c/CURLOPT_FOLLOWLOCATION.html),
[curl_cffi Session API](https://curl-cffi.readthedocs.io/en/latest/api.html),
[gevent native thread pool](https://www.gevent.org/api/gevent.threadpool.html).
