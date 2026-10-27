# yt-dlp dependency review — 23 October 2026

## Stable engine update

The official GitHub stable release and PyPI both report **2026.10.21**.
The repository now pins that release and `certifi==2026.10.19`, the CA bundle
required by the current default extra. Both wheels and source archive hashes
were checked against PyPI and retained in `backend/requirements.lock`.
`yt-dlp-ejs==0.8.0` remains the exact EJS version required by this release.
Unrelated runtime and provider packages were not upgraded.

## Reported Pornhub failure

The existing EC2 service was inspected through its existing Instance Connect
session. Its installed versions were yt-dlp 2026.8.19 and certifi 2026.7.22.
The reported request failed on the source webpage with HTTP 410, before a
video download was started. The public `platform_restricted` response had
hidden this distinction. The same URL produced source formats locally with
2026.10.21; that does not establish success from the EC2 egress address.

The Pornhub extractor source is identical in 2026.08.19 and 2026.10.21, so
an engine upgrade alone must not be described as a verified fix for this
provider. `SafeYoutubeDL` continues to exclude native libcurl handlers:
these bypass the Python socket SSRF boundary. That boundary must not be
removed to make impersonation work. The staged EC2 check still returned 410 with the guarded Python handler and
403 with a diagnostic browser-impersonation profile. Supported alternate
provider domains were also rejected. This is consistent with an upstream
restriction on the server/network, but does not prove the exact blocking rule.
The production request path and SSRF guard were left intact.

## Browser console

Socket.IO 4.7.2 is now served from the site itself. Its original CDN bytes
were checked against the existing SHA-512 integrity value, the development
source-map URL was removed, and the script integrity value was recalculated.
The upstream MIT license is included. No CSP network permission was added.

The screenshot's blocked Cloudflare analytics beacon is an extension/client
block, and the unsupported Permissions-Policy features are browser warnings.
Neither records the failed backend extraction request.

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

## EC2 engine update and verification

The existing instance and AWS account were verified before use. Only yt-dlp,
certifi and their requirement/lock entries were changed; the server's modified
application code, proxy configuration, cookies, environment and provider were
preserved. Official old wheels and both previous requirements files were saved
under `/home/ubuntu/zenithw-stage-20261023/rollback/` on that server.

After installation, `pip check` reported no broken requirements. The backend
service was restarted and returned active, `/health` returned 204 and `/ready`
returned `{"status":"ready"}`. The interpreter reports yt-dlp 2026.10.21 and
certifi 2026.10.19. This is an engine/CA update, not a verified resolution of the
Pornhub source rejection and not an update of the separately deployed PO provider.

Rollback uses the retained wheels with `pip install --no-index --find-links`
and the hashed rollback requirements, restores the two saved requirements
files, then restarts the existing backend service and checks its readiness.

Relevant local download/security checks passed (67 + 14 tests), as did the
8 frontend cache/CSP tests. Local browser inspection loaded the self-hosted
Socket.IO client successfully with its new SRI and produced no console errors.
The entire historical frontend test suite is not claimed to pass; it includes
outdated release/status-page expectations unrelated to this change.

## Primary sources

- [yt-dlp latest stable release](https://github.com/yt-dlp/yt-dlp/releases/latest)
- [yt-dlp PyPI metadata](https://pypi.org/pypi/yt-dlp/2026.10.21/json)
- [EJS runtime guidance](https://github.com/yt-dlp/yt-dlp/wiki/EJS)
- [Provider 2.0.1 installation and compatibility](https://github.com/Brainicism/bgutil-ytdlp-pot-provider/blob/2.0.1/README.md)
- [Provider security advisory](https://github.com/Brainicism/bgutil-ytdlp-pot-provider/security/advisories/GHSA-qpv9-8xfj-xx9m)
