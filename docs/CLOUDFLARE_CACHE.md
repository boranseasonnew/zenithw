# Cloudflare cache audit and changes

Audit date: 5 October 2026. Changes are local; no production deployment, Git push, Cloudflare account change, or cache purge was performed.

## Actual architecture

This checkout is not a Next.js website. The root package contains Mediabunny 1.56.1 and esbuild 0.25.12, with static HTML/CSS/JavaScript in frontend/. There is no Next.js dependency/version, next.config.*, Next middleware, app/pages server routes, ISR, or _next/static output. The separate promo-video project is Remotion and is not the website.

The frontend is Cloudflare Pages. The checked-in deployment inventory in docs/LOCAL_DEPLOYMENT.md records repository-root builds, output directory frontend, and the dashboard build command exit 0. These are recorded deployment settings, not a fresh authenticated dashboard inspection. The frontend files are also the checked-in deployable output. The root functions/_middleware.js is the Pages maintenance gate and is bundled with imports from shared/. The API runs Flask, Gunicorn, Socket.IO, yt-dlp and FFmpeg on EC2 behind Nginx at api.zenithw.space. Docker self-hosting proxies /api/ separately.

Existing frontend/_headers and frontend/_redirects are in the correct Pages output directory. No wrangler.toml/json/jsonc or Next configuration exists in this checkout. No unused Next.js or Wrangler configuration was added. The redirects were preserved.

The build now runs the existing update-page and local-media generators, then the cache generator. Deploy-ready cache output is checked in under frontend/, so the recorded exit 0 deployment still consumes these files. For future source changes, run npm run build and include generated outputs. Setting the Pages dashboard build command to npm run build would also generate them in CI; no dashboard setting was changed here.

## Findings and fixes

- The root Pages middleware handled every asset request and loaded maintenance configuration for each one. frontend/_routes.json now excludes public asset paths, fonts, vendor files and the generated asset directory. HTML and maintenance routes still invoke the Function. A matching allowlist in the middleware is a fallback for deployments missing the routes file; it does not classify arbitrary API paths as static based on their extension.
- Seven of the eight old hash-shaped JS/CSS filenames no longer matched their contents. Their names had been retained after edits. They must not be treated as content-addressed immutable files. The original URLs are retained with a one-hour TTL for compatibility.
- fonts.css and GeistMono-Variable.woff2 were unversioned but previously marked immutable. New hashed copies make their long lifetime safe; original font URLs use finite TTLs.
- Ten deployable copies now have SHA-256 fingerprints in their filenames. The generator rewrites page resource references, fingerprints the archive dependency before the updates loader, and fingerprints the font before its stylesheet. Content changes rotate URLs. Existing generated versions are retained for cached consumers and validated, with an explicit failure before Pages header/routing limits can be exceeded.
- Redundant ?v= queries were removed from the newly fingerprinted references. Their hashes already version them, so the same file uses one URL across pages.
- The previous CSP line exceeded Pages' 2,000-character _headers line limit. The full hash-based HTML policy is now generated into shared/pages-security.mjs and attached by the Function, including maintenance responses. _headers carries a compact static-resource policy and the existing security headers. Inline script permissions remain hash-based, without blanket unsafe-inline for scripts.
- There was no service-wide no-store guarantee for every Flask success/error/file response. Flask's send_file default no-cache permits storage and revalidation. The existing response hook now forces private, no-store on every API response, including prepared files and token errors. Both Nginx proxy configurations also enforce cache bypass, covering Socket.IO and proxy-generated errors outside Flask.
- Client fetch no-store flags for live status, transfer polling, prepared downloads and maintenance are intentional. They were preserved. There are no unnecessary Next server-side cookie/header calls or revalidate: 0 settings to remove. Browser-local settings/history are not server-personalized HTML.

## Effective policy

| Response | Policy |
| --- | --- |
| The 10 verified hashed JS/CSS/font copies | public, max-age=31536000, immutable |
| Logos, favicon, poster, unversioned/legacy JS and CSS, local media worker | public, max-age=3600, must-revalidate |
| Original unversioned font and its license | public, max-age=86400, s-maxage=604800, must-revalidate |
| robots.txt and sitemap.xml | Browser revalidation; shared TTL 300 seconds |
| version.js | Browser revalidation; CDN no-store |
| runtime-config.js and maintenance config | no-store |
| Public HTML without credentials | public, max-age=0, must-revalidate; CDN no-store |
| HTML requests with Cookie/Authorization, Set-Cookie responses, non-GET/HEAD or errors | private, no-store |
| Maintenance page/status, active-maintenance 503 and method errors | private, no-store |
| Flask API, download/convert/thumbnail/info/cancel, temporary files, status/health/diagnostics and errors | private, no-store; both CDN cache-control headers no-store |
| API Socket.IO and proxy errors | Nginx-enforced private, no-store |

The static HTML file itself is shared, but the maintenance decision is live. Long outer-CDN HTML caching could serve a normal page during maintenance or keep a maintenance response after recovery. HTML therefore retains the Function and browser revalidation; Pages still has its internal static asset cache. No domain-wide Cache Everything rule or private-response cache was introduced.

Caching of fixed public assets does not depend on user identity. Their responses are never generated from a session. Cookie/auth protection applies to dynamic responses; the public asset exclusions are intentional.

Cloudflare can override response TTLs through dashboard settings. The initial live sample showed a 14,400-second policy for logos and unversioned JS. To preserve the shorter configured browser TTL, check Browser Cache TTL is set to respect existing headers and inspect any overriding Cache/Page Rules. Keep api.zenithw.space explicitly bypassed if zone cache rules exist. Do not override no-store or cache HTML across the maintenance gate. Account-level rules were not inspected or changed.

## Initial production observations

The 6.26% hit rate is user-provided; no authenticated Analytics dataset was available to break it down by hostname/path.

Initial public checks before editing returned:
- /: HTTP 200, CF-Cache-Status DYNAMIC, public, max-age=0, must-revalidate.
- /app.d4596317c4a7.js and /fonts.css: HTTP 200, MISS, one-year immutable.
- /zenithw.png and /site-shell.js: HTTP 200, MISS, max-age=14400, must-revalidate.
- /robots.txt: HTTP 200, REVALIDATED, max-age=14400, must-revalidate.
- /maintenance-status and /maintenance-config.json: HTTP 200, DYNAMIC, no-store.
- api.zenithw.space/health: HTTP 204, DYNAMIC, no-store.
- api.zenithw.space/status: HTTP 200, DYNAMIC, no-store.

These samples do not prove the cause of the entire zone's low hit rate. Later unauthenticated public requests encountered a Cloudflare 403, so production probes were not used to claim post-change results.

## Expected effect

Static files now avoid Function invocations and unnecessary maintenance-config fetches. Content-hashed resources can be reused for a year without stale-code risk; stable asset URLs also avoid fragmented query-version cache keys.

The static-asset hit rate should improve as regional caches warm. A numeric overall target cannot be estimated without the request mix. API polling, Socket.IO, private temporary downloads and maintenance-dependent HTML intentionally remain uncached; API/media traffic can dominate a whole-zone request or byte ratio. Longer browser caching also removes repeat requests from Cloudflare entirely, so whole-zone hit rate is not a standalone performance metric.

Filter Analytics to zenithw.space and the static asset paths separately from api.zenithw.space, HTML and /maintenance-status. Compare Function invocation count and static asset HIT/MISS distribution after deployment using a comparable traffic period.

## Verification completed locally

- Full npm run build passed, including all 60 release pages and the local media bundle.
- npm run check:cache passed and confirms deterministic fingerprints, current CSP, output files and valid configuration.
- 12 cache/static-content/language tests passed. They cover hash rotation, transitive dependencies, retained previous versions, safe routing, maintenance, credential responses and errors.
- Cloudflare Wrangler 4.138.0 compiled the real Pages Function successfully.
- An actual Wrangler Pages preview served all 10 hashed assets with the exact policy and expected SHA-256 body, served logo/favicon/shared JS with a one-hour TTL, and served HTML/maintenance/runtime responses with the intended cache boundaries. The checker made 38 successful GET response checks. Local preview has no CF-Cache-Status or Age because it is not an edge deployment.
- Backend suite: 121 tests run, 119 passed, two failures existed before this task. The old tests expect class="home-wordmark" and the current release to still be v14.4. Both were reproduced against the preserved pre-change frontend. They were left unchanged.
- API header tests verify success/error status codes and token-transfer headers without starting media jobs. No live user file or provider job was requested.
- Comparing the 78 changed HTML files after masking only JS/CSS/font resource URLs found no other HTML difference. Titles, descriptions, canonicals, structured data, links and UI markup were preserved. sitemap.xml and the media worker bundle are byte-identical to their pre-change state.
- Production Nginx reload, API deployment and actual post-deployment edge HIT/Age behavior have not been performed.

## Deployment and response checks

Deploy the frontend output and the root functions/ plus shared/ code through the existing Pages deployment process. Apply backend/app.py and the official Nginx proxy configuration through the existing EC2 deployment procedure. The Docker proxy file is for self-hosting. These are separate deployment targets.

After deployment, from the repository root:

    node scripts/check-cache-headers.mjs

The checker repeats identical public GET URLs without cache-busting or request no-cache headers, prints Cache-Control, CF-Cache-Status, Age and ETag, verifies deployed body fingerprints, and checks safe GET API paths without starting jobs or using real download tokens. It can be pointed at a preview:

    node scripts/check-cache-headers.mjs --base-url https://YOUR-PREVIEW.pages.dev --skip-api

For manual checks, run the same command twice:

    curl -sSI https://zenithw.space/cache-assets/app.92a2eed5ae77.js
    curl -sSI https://zenithw.space/zenithw.png
    curl -sSI https://zenithw.space/
    curl -sSI https://api.zenithw.space/health

For hashed assets, expect public, max-age=31536000, immutable, an ETag, and typically MISS followed by HIT at the same edge location. Age may be zero on the first cached response and should increase while the object stays cached. CDN eviction, deployment purges and different edge locations can cause additional misses.

For logos/icons expect finite TTLs without immutable. HTML should revalidate and should not become a long-lived outer-CDN HIT. API/file/maintenance responses must retain no-store and must not be HIT. Cloudflare may consume its dedicated CDN cache-control header rather than exposing it downstream.

If a zone rule overrides the headers, correct that rule to respect origin headers or bypass the sensitive hostname/paths. Inspect targeted assets before choosing any purge; a broad domain purge was not made.

## Complete file list for this task

The following list compares against the initial worktree, preserving earlier user edits and excluding untouched files that already appeared in git status. The HTML files listed below changed only their static resource URLs.

88 modified existing files; 19 added files; 107 files total.

- [.github/workflows/security-audit.yml](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\.github\workflows\security-audit.yml>) — modified
- [backend/app.py](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\backend\app.py>) — modified
- [backend/deploy/nginx/zenithw.conf](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\backend\deploy\nginx\zenithw.conf>) — modified
- [backend/tests/test_cache_headers.py](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\backend\tests\test_cache_headers.py>) — added
- [backend/tests/test_deployment_security.py](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\backend\tests\test_deployment_security.py>) — modified
- [docker/nginx/default.conf](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\docker\nginx\default.conf>) — modified
- [docs/CLOUDFLARE_CACHE.md](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\docs\CLOUDFLARE_CACHE.md>) — added
- [frontend/_headers](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\_headers>) — modified
- [frontend/_routes.json](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\_routes.json>) — added
- [frontend/about.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\about.html>) — modified
- [frontend/about/community.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\about\community.html>) — modified
- [frontend/about/credit.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\about\credit.html>) — modified
- [frontend/about/privacy.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\about\privacy.html>) — modified
- [frontend/about/terms.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\about\terms.html>) — modified
- [frontend/app.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\app.html>) — modified
- [frontend/cache-assets/GeistMono-Variable.afaacc4c5fbb.woff2](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\cache-assets\GeistMono-Variable.afaacc4c5fbb.woff2>) — added
- [frontend/cache-assets/app.92a2eed5ae77.js](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\cache-assets\app.92a2eed5ae77.js>) — added
- [frontend/cache-assets/compare.a0575b77ab4c.css](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\cache-assets\compare.a0575b77ab4c.css>) — added
- [frontend/cache-assets/fonts.4ed1cddfa4da.css](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\cache-assets\fonts.4ed1cddfa4da.css>) — added
- [frontend/cache-assets/info-page.a3e72fe763fa.js](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\cache-assets\info-page.a3e72fe763fa.js>) — added
- [frontend/cache-assets/info.51fddf091785.css](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\cache-assets\info.51fddf091785.css>) — added
- [frontend/cache-assets/style.0a44b1a04019.css](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\cache-assets\style.0a44b1a04019.css>) — added
- [frontend/cache-assets/updates-archive.834ee93b2c57.js](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\cache-assets\updates-archive.834ee93b2c57.js>) — added
- [frontend/cache-assets/updates-core.1d4d137b3dec.js](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\cache-assets\updates-core.1d4d137b3dec.js>) — added
- [frontend/cache-assets/updates.a6d7da63ee50.css](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\cache-assets\updates.a6d7da63ee50.css>) — added
- [frontend/community.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\community.html>) — modified
- [frontend/convert.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\convert.html>) — modified
- [frontend/credit.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\credit.html>) — modified
- [frontend/dmca.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\dmca.html>) — modified
- [frontend/history.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\history.html>) — modified
- [frontend/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\index.html>) — modified
- [frontend/privacy.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\privacy.html>) — modified
- [frontend/remux.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\remux.html>) — modified
- [frontend/settings.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\settings.html>) — modified
- [frontend/status.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\status.html>) — modified
- [frontend/support.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\support.html>) — modified
- [frontend/terms.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\terms.html>) — modified
- [frontend/updates.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates.html>) — modified
- [frontend/updates/v10.0/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v10.0\index.html>) — modified
- [frontend/updates/v10.1/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v10.1\index.html>) — modified
- [frontend/updates/v10.2/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v10.2\index.html>) — modified
- [frontend/updates/v10.3/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v10.3\index.html>) — modified
- [frontend/updates/v10.4/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v10.4\index.html>) — modified
- [frontend/updates/v10.5/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v10.5\index.html>) — modified
- [frontend/updates/v10.6/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v10.6\index.html>) — modified
- [frontend/updates/v10.7/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v10.7\index.html>) — modified
- [frontend/updates/v10.8/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v10.8\index.html>) — modified
- [frontend/updates/v10.9/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v10.9\index.html>) — modified
- [frontend/updates/v11.0/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v11.0\index.html>) — modified
- [frontend/updates/v11.1/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v11.1\index.html>) — modified
- [frontend/updates/v11.2/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v11.2\index.html>) — modified
- [frontend/updates/v11.3/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v11.3\index.html>) — modified
- [frontend/updates/v11.4/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v11.4\index.html>) — modified
- [frontend/updates/v11.5/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v11.5\index.html>) — modified
- [frontend/updates/v11.6/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v11.6\index.html>) — modified
- [frontend/updates/v11.7/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v11.7\index.html>) — modified
- [frontend/updates/v12.0/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v12.0\index.html>) — modified
- [frontend/updates/v12.1/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v12.1\index.html>) — modified
- [frontend/updates/v12.2/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v12.2\index.html>) — modified
- [frontend/updates/v12.3/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v12.3\index.html>) — modified
- [frontend/updates/v12.4/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v12.4\index.html>) — modified
- [frontend/updates/v12.5/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v12.5\index.html>) — modified
- [frontend/updates/v12.6/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v12.6\index.html>) — modified
- [frontend/updates/v12.7/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v12.7\index.html>) — modified
- [frontend/updates/v12.8/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v12.8\index.html>) — modified
- [frontend/updates/v12.9/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v12.9\index.html>) — modified
- [frontend/updates/v13.0/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v13.0\index.html>) — modified
- [frontend/updates/v13.1/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v13.1\index.html>) — modified
- [frontend/updates/v13.2/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v13.2\index.html>) — modified
- [frontend/updates/v13.3/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v13.3\index.html>) — modified
- [frontend/updates/v13.4/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v13.4\index.html>) — modified
- [frontend/updates/v13.5/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v13.5\index.html>) — modified
- [frontend/updates/v13.6/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v13.6\index.html>) — modified
- [frontend/updates/v13.7/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v13.7\index.html>) — modified
- [frontend/updates/v13.8/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v13.8\index.html>) — modified
- [frontend/updates/v14.0/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v14.0\index.html>) — modified
- [frontend/updates/v14.1/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v14.1\index.html>) — modified
- [frontend/updates/v14.2/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v14.2\index.html>) — modified
- [frontend/updates/v14.3/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v14.3\index.html>) — modified
- [frontend/updates/v14.4/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v14.4\index.html>) — modified
- [frontend/updates/v4.0/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v4.0\index.html>) — modified
- [frontend/updates/v5.0/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v5.0\index.html>) — modified
- [frontend/updates/v5.1/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v5.1\index.html>) — modified
- [frontend/updates/v5.2/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v5.2\index.html>) — modified
- [frontend/updates/v5.3/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v5.3\index.html>) — modified
- [frontend/updates/v5.4/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v5.4\index.html>) — modified
- [frontend/updates/v5.5/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v5.5\index.html>) — modified
- [frontend/updates/v5.6/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v5.6\index.html>) — modified
- [frontend/updates/v6.0/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v6.0\index.html>) — modified
- [frontend/updates/v6.1/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v6.1\index.html>) — modified
- [frontend/updates/v7.0/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v7.0\index.html>) — modified
- [frontend/updates/v7.1/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v7.1\index.html>) — modified
- [frontend/updates/v7.2/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v7.2\index.html>) — modified
- [frontend/updates/v7.3/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v7.3\index.html>) — modified
- [frontend/updates/v8.0/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v8.0\index.html>) — modified
- [frontend/updates/v8.1/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v8.1\index.html>) — modified
- [frontend/updates/v9.0/index.html](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\frontend\updates\v9.0\index.html>) — modified
- [functions/_middleware.js](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\functions\_middleware.js>) — modified
- [package.json](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\package.json>) — modified
- [scripts/build-cache-assets.mjs](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\scripts\build-cache-assets.mjs>) — added
- [scripts/cache-assets-manifest.json](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\scripts\cache-assets-manifest.json>) — added
- [scripts/check-cache-headers.mjs](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\scripts\check-cache-headers.mjs>) — added
- [scripts/update_csp.py](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\scripts\update_csp.py>) — modified
- [shared/pages-cache-assets.mjs](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\shared\pages-cache-assets.mjs>) — added
- [shared/pages-security.mjs](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\shared\pages-security.mjs>) — added
- [tests/cloudflare-cache.test.mjs](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\tests\cloudflare-cache.test.mjs>) — added
- [tests/local-media-browser.mjs](<\\wsl$\Ubuntu\home\gurkay\ZenithW - Video Downloader\tests\local-media-browser.mjs>) — modified
