# Repository security, responsiveness and SEO review — 2 November 2026

## Scope

This extends [the dependency and media-tools review](security-media-review-2026-11-02.md), including its existing uncommitted fixes. The inventory contains 1,449 tracked files, 155 first-party code files including tests/new files, and 708 HTML pages. Generated hashed bundles and third-party vendored code are excluded from the first-party code count. Review covered backend request/file boundaries, desktop process/queue/persistence boundaries, website/media tools, local Supabase Type handlers/SQL, dependency locks and CI. Counts describe scope, not a claim that every line is proven secure.

The work is local. It does not inspect the running EC2 machine, installed applications, Android source, live Supabase policies or operating-system/container packages. There was no production deployment, release publication or database migration.

## Concrete findings and changes

### Thumbnail requests could exceed the intended total time budget

`backend/app.py` previously applied a socket timeout to a streamed thumbnail. A source sending small chunks could keep the request/slot occupied beyond that intended budget. The request now has a gevent wall-clock timeout plus a monotonic deadline checked while reading. Existing image/byte limits, destination restrictions and temporary-file cleanup remain in effect. Tests cover successful output and a slowly trickling source that times out and removes its partial file.

### Concurrent avatar changes could overwrite a newer image or leave an unused upload

`supabase/functions/typing-api/avatar.mjs` now updates profiles using a compare-and-set on the previous `avatar_version` and checks the returned row. A stale request receives a conflict, its new upload is cleaned up, and the old image is deleted only after a successful profile update. Stale removal cannot clear a newer avatar. Storage cleanup errors emit a generic message without object paths/tokens and preserve the original transaction result.

Five mocked concurrency/error tests pass. A storage outage can still prevent cleanup and leave an unused object; there is no new automated garbage collector. This Edge Function change has not been deployed or exercised against the live service. No RLS/schema relaxation was added.

### Large WAV and ZIP exports performed synchronous work

`shared/audio-export.mjs` adds cooperative PCM16 WAV encoding and ZIP CRC computation with cancellation. Work yields after an approximately eight-millisecond budget at bounded processing boundaries; this is not a hard execution-time guarantee on every device. CRC input streams from the WAV Blob instead of creating a second whole-file byte buffer. ZIP retains standard uncompressed WAV entries.

The separator integrates these exports with its existing busy/progress/cancel controls. MP3 and FLAC retain their worker path. Tests compare WAV bytes against the SDK at four sample rates, cancel an in-progress encode, and validate ZIP checksums/files with Python's standard `zipfile` and `wave` readers. Chromium downloaded both WAV and ZIP successfully. Blob creation, PCM allocation/decoding, and model inference still need CPU and memory; no real-phone or neural-inference speed claim is made.

The previous waveform optimization yielded timer callbacks during a synthetic four-minute result: maximum observed callback gap **46.22 → 14.42 ms**, with total CPU preparation **46.22 → 50.30 ms**. This improves responsiveness rather than total computation time. Lazy playback defers a calculated **161.5 MiB** allocation for that stereo/two-stem case until playback or seek.

### Seven localized homepage settings links resolved to missing pages

The shared source now links to `/settings` instead of a relative `settings.html`; all seven generated non-root homepages inherit the fix. A permanent HTML test verifies real internal anchor destinations, public-page metadata, private-page indexing rules, duplicate IDs and replacement-character corruption.

After regeneration: **708 HTML pages, zero broken static internal links, zero missing required public-page metadata fields, zero duplicate IDs**. The audit is structural; it does not verify external links or guarantee ranking/indexing. The separator's eight-language descriptions, visible guidance, canonical/alternate links and WebApplication schema from the preceding changes are included. Type SEO remains limited to its existing Turkish/English routes rather than inventing untranslated versions.

### The standalone promotional-video project had a high-severity dependency advisory

All Remotion packages in `promo-video/package.json` were aligned from **4.0.531 to 4.0.539**. Its single Zod 4 dependency is overridden to **4.6.7**, above the affected range in [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). npm compatible audit fixes were applied without `--force`.

`npm ci --prefix promo-video --ignore-scripts`, ESLint/TypeScript and `remotion bundle` pass. Remotion's version checker still warns that it expects Zod 4.5.4; the override deliberately retains the security fix. Compilation/bundling passed, but a full video render was not performed, so rendering compatibility is not established. Generated bundle output is ignored and the verification output was removed locally.

### Desktop regression tests were unable to exercise current behavior reliably

The VM harness now supplies browser/runtime globals, isolated fake tool executables and unreferenced background timers. Tests await asynchronous publication and reflect current history persistence/queue semantics. **24/24 desktop and boundary tests pass**, superseding the previous review's 13/24 result. Windows sandbox file permissions required running the final suite with normal filesystem access; production overwrite logic was not changed to bypass that restriction. These are mocked-process integration tests, not an installed Windows-app or installer test.

### Build and CI resilience

The CSP generator skips unchanged outputs and retries a small set of transient filesystem errors; unrelated errors still propagate. Tests verify unchanged output, transient retry, and a real non-retryable write error. Cache and CSP integrity checks pass.

The security workflow now includes whole-site HTML checks, desktop queue/security regressions, Type permissions/scoring/avatar tests, media tests and audit/lint/bundle checks for the separate promo project. It retains dependency-audit failure thresholds at high severity. These workflow changes were verified through their local commands; a hosted Actions run has not occurred.

## Dependency audit results

| Scope | Before | Current known audit findings |
| --- | --- | --- |
| Website npm lock | 0 | 0 |
| Python hash lock, 39 packages | 0 after earlier pin updates | 0 |
| Desktop npm lock | 18, including 2 high | 15 moderate; 0 high/critical |
| Standalone promo npm lock | 23, including 10 high | 12 moderate; 0 high/critical |

The remaining moderate entries primarily propagate the [minimatch glob-amplification advisory](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249) through development/packaging tools. They are dependency-path findings, not 27 distinct vulnerabilities. The upstream/database range discrepancy is [still tracked](https://github.com/github/advisory-database/issues/10811). They are not suppressed, and no speculative cross-major override/downgrade was introduced. Audits are point-in-time database checks, not proof that dependencies have no undiscovered flaws.

The existing prepared Electron, Undici, fast-uri, yt-dlp, curl-cffi, certifi and Socket.IO fixes are detailed in the preceding report. Website runtime dependencies did not change; root npm and pnpm lockfiles remain unchanged. Promo and desktop npm locks were updated separately.

## Verification results

| Check | Result |
| --- | --- |
| Combined Node tests: website/static/security/media/Type/desktop | **133 passed, 0 failed, 0 skipped** |
| Python backend and build-helper tests | **133 passed** |
| Desktop subset included above | **24 passed** |
| Chromium media regression | Real Web Audio, WAV/ZIP downloads, local MP4→MKV, explicit start, privacy and 390px layout passed |
| Production website build | Passed; 688 self-canonical sitemap URLs generated |
| Website lint, cache integrity, CSP integrity, whitespace check | Passed |
| Promo clean install, ESLint/TypeScript, bundle | Passed; Zod version warning noted above |
| Bandit backend scan, medium/high threshold | No medium/high findings; no scan errors |
| Source credential-pattern check | No candidate private-key, GitHub-token or service-role-JWT leak found in the scanned first-party text |

Bandit intentionally skips B104 for the public service's all-interface bind; low-severity flags are outside that threshold. The credential check is pattern-based, not a complete secret detector, and does not cover history/private ignored files. Public frontend publishable configuration is not treated as a secret.

Browser separation tests use synthetic stem output rather than downloading/running the neural model. Remux tests use real FFmpeg-generated fixtures; MP4→MKV→MP4, MOV/M4V and WebM container cases pass, and incompatible codecs fail without silent transcoding. No physical mobile device, new desktop installer, full promo render, live Supabase function or production backend was validated.

## Changed source groups and rollout

- Security: `backend/app.py`, Python/desktop/promo locks and manifests, pinned browser client, `supabase/functions/typing-api/{index.ts,avatar.mjs}`.
- Media responsiveness: `shared/{audio-preview.mjs,audio-export.mjs,lilith-studio.ts}` and media/remux controls.
- SEO/build: homepage settings link, media copy/builders, generated eight-language HTML/sitemap/cache/CSP outputs.
- Regression coverage: backend deadline/CSP tests, desktop harness/tests, audio/HTML/avatar/media tests and `.github/workflows/security-audit.yml`.

One newly generated, unreferenced intermediate hashed asset was removed; tracked historical cached assets were retained for existing clients. No user source or download was deleted. Rollout requires the website publication, backend deployment, desktop rebuild/release and Type Edge Function deployment for their respective changes to reach users. Each can be reverted independently to the prior source/lock revision; no data migration is required.

## Web 17.0 release checkpoint

The subsequent release preparation updates the web version/date to **17.0 / 2 November 2026**, publishes six substantial release-note sections in all eight existing languages, and retains 16.1 as a separately addressable archive. Five root-language READMEs plus the desktop, Store and promo READMEs were refreshed; third-party source/license READMEs were preserved.

After release generation, the website contains **716 HTML pages and 696 self-canonical sitemap URLs**. The full Node suite now has **134 passing tests**, including eight-language release/version/archive consistency. Backend tests remain **133 passing**. Real Chromium checks also cover English/Japanese release navigation and preservation of the selected language when opening an older/newer release. Website lint, release-content consistency and cache/CSP integrity pass. Ten additional newly generated, unreferenced intermediate cache assets were removed before publication; historical tracked assets were retained.

Windows **4.2.0** and Android **2.4.1** download versions remain distinct from web 17.0. Pushing the website source does not deploy backend/Type code or rebuild those installed application packages.
