# yt-dlp dependency review — 7 October 2026

## Version decision

The project pins yt-dlp `2026.08.19`. The official GitHub latest stable release
and PyPI both report that same release. PyPI and the lock file normalize it to
`2026.8.19`; these are the same version. Its wheel and source archive SHA-256
values match the existing lock entry. No yt-dlp upgrade is necessary today.

The pinned `yt-dlp-ejs==0.8.0` is also current and is exactly the EJS version
required by yt-dlp's default extra. The pinned requests, websockets and curl-cffi
versions satisfy this release's declared ranges. Deno `2.8.3` exceeds EJS's
documented 2.3.0 runtime minimum; a newer Deno exists, but it is a separate runtime
upgrade and was not bundled into this targeted change. Nightly yt-dlp builds
exist, but no diagnosed extraction failure here requires changing release channel.

## Companion provider update

The project previously pinned `bgutil-ytdlp-pot-provider==1.3.1`. It now pins
`2.0.1`, including the official wheel and source archive hashes in the lock file.
Both package versions declare Python >=3.8 and no additional Python dependencies,
so unrelated dependency pins and hashes remain unchanged. The downloaded official
wheel's metadata and SHA-256 were inspected without executing its code.

The provider's official advisory GHSA-qpv9-8xfj-xx9m affects its HTTP server
before 2.0.0. Version 2.0.1 includes the fix and further server dependency fixes.
This is a two-part system: the Python plugin contacts a separately deployed
JavaScript server. Updating requirements alone does **not** patch that server.
The app's existing `youtubepot-bgutilhttp:base_url` option remains supported.
The public site's YouTube web restriction remains in place.

## AWS deployment requirements

The expired AWS CLI session prevented a fresh production package inventory in
this review. The repository pin is not evidence of the installed AWS version.
The public API health endpoint still returned 204 with private/no-store caching.

Before changing production:

1. Renew the existing AWS login and verify the account and instance against
   `docs/LOCAL_DEPLOYMENT.md`.
2. Read the actual service interpreter and installed package versions. Locate
   the PO Token provider service/container, its version and its listening address.
3. If the HTTP provider is in use, update its server and Python plugin together
   to 2.0.1. Native servers should bind to loopback. Docker port publishing must
   use `127.0.0.1:4416:4416`, as the maintainer specifies. Do not expose port 4416.
4. Prepare backups and a separate dependency environment; compare files before
   replacing them. Preserve environment secrets, cookies and download state.
5. Apply only the reviewed changes, then check service startup and the existing
   health/readiness/status endpoints. Use the previous environment and server
   version for rollback if startup or provider connectivity fails.

No production server upgrade or full backend deployment is claimed by this note.

## Primary sources

- [yt-dlp latest stable release](https://github.com/yt-dlp/yt-dlp/releases/latest)
- [yt-dlp PyPI metadata](https://pypi.org/pypi/yt-dlp/2026.8.19/json)
- [EJS runtime guidance](https://github.com/yt-dlp/yt-dlp/wiki/EJS)
- [Provider 2.0.1 installation and compatibility](https://github.com/Brainicism/bgutil-ytdlp-pot-provider/blob/2.0.1/README.md)
- [Provider security advisory](https://github.com/Brainicism/bgutil-ytdlp-pot-provider/security/advisories/GHSA-qpv9-8xfj-xx9m)
