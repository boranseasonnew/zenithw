# Security and media tools review — 2 November 2026

## Scope and dependency changes

This review covers the checked-in website, Python backend lock, desktop npm lock and the separately shipped Socket.IO browser bundle. It does not establish the state of an installed Windows application, the live EC2 environment, Android, or OS/container packages.

| Component | Before | Prepared version | Reason |
| --- | --- | --- | --- |
| Electron | 44.7.0 | 44.10.1 | Same-major update covering the compromised eMudhra intermediate certificate mitigation; first patched 44.x is 44.9.1. |
| electron-builder | 26.15.3 | 26.18.0 | Current compatible packaging-tool update. |
| Desktop transitive Undici | vulnerable 6.x/7.x | 6.29.1 / 7.30.1 | Audit remediation within dependency constraints, including certificate-option and denial-of-service fixes. |
| Desktop fast-uri | affected versions | 3.1.9 | URI parsing fixes selected by npm audit fix without force. |
| yt-dlp | 2026.10.21 | 2026.10.26 | Stable release supporting curl-cffi 0.17 and its security fixes. |
| curl-cffi | 0.16.3 | 0.17.0 | Completes the recent CA certificate mitigation; updating certifi alone was insufficient. |
| certifi | 2026.10.19 | 2026.10.23 | Current CA bundle aligned with the engine's release pins. |
| Socket.IO browser client | 4.7.2 | 4.8.4 | Independently distributed file outside npm audit, refreshed for parser fixes. Old bundle removed. |

The Python hash lock was regenerated with pip-tools and installed successfully with `--require-hashes`. No website runtime npm dependencies changed; both existing website locks remain unchanged. Socket.IO is downloaded from cdnjs, served from our origin, pinned with SHA-256 and SHA-512 SRI in `shared/browser-dependencies.json`, and kept byte-identical on checkout.

Audit results on this date: website npm lock **0 findings**; Python lock **0 known vulnerabilities**; desktop npm lock **18 findings (2 high) → 15 moderate, 0 high/critical**. The 15 remaining entries are dependency paths primarily propagating minimatch GHSA-g3hv-75wg-m249. Upstream lists 10.2.6 affected while the database lists every version below 11.0.1. This range discrepancy is unresolved. No broad major-version override or `npm audit fix --force` was used. Packaging consumes project-controlled patterns; no runtime exposure to an untrusted media filename as a build glob was demonstrated. These records remain open, not suppressed.

Sources: [Electron advisory](https://github.com/advisories/GHSA-jr5w-w6x2-84p9), [yt-dlp release](https://github.com/yt-dlp/yt-dlp/releases/tag/2026.10.26), [Socket.IO parser advisory](https://github.com/socketio/socket.io/security/advisories/GHSA-677m-j7p3-52f9), [minimatch advisory](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249), [range clarification issue](https://github.com/github/advisory-database/issues/10811).

## Audio separator: SEO and responsiveness

All eight existing locales retain self-canonicals and reciprocal language alternates. New descriptions and visible, translated explanatory text describe vocal/instrumental previews, MP3/FLAC/WAV exports, private device processing, first-use model/runtime downloads, four-minute/96 MiB limits and codec/quality limitations. The language builder now describes the separator as a factual WebApplication. Sitemap modification dates reflect this content change. A separator header translation no longer overwrites the shared Downloads label.

Inference already ran in a worker; it was not replaced. Changes target result preparation:

- Exact PCM waveform peaks are computed in cooperative chunks, yielding approximately every eight milliseconds when needed, with cancellation and a Safari-compatible timer fallback. No transfer or duplicate PCM buffers are needed for this calculation.
- Playback AudioBuffers are allocated only when playing or seeking. For a four-minute, 44.1 kHz stereo result with two stems, this defers **161.5 MiB** of additional playback-buffer allocation. This is a calculated allocation size, not a device-memory measurement; playing still needs these buffers.
- Progress updates within a stage are limited to roughly 10 per second, while stage transitions, warnings and completion are retained.
- Waveform canvases redraw when the playback pixel changes; clock/ARIA text updates when the displayed time changes.

Synthetic Node 24 measurement, same 240-second stereo PCM and two waveform preparations:

| Measurement | Before | After |
| --- | ---: | ---: |
| Total preparation time | 46.22 ms | 50.30 ms |
| Other timer callbacks during preparation | 0 | 4 |
| Largest observed callback gap | 46.22 ms | 14.42 ms |

This measures responsiveness, not faster neural inference, browser Core Web Vitals or real-phone performance. CPU processing, model download, first playback-buffer creation, Web Audio decoding and large WAV/ZIP exports can still take time or significant memory. No blanket promise of stutter-free processing is made.

## Remux behavior

The engine already accepted other containers, but the UI immediately submitted each file using its original extension. The UI now keeps the chosen file, offers an explicit output selector and waits for Start remux. MP4, MKV, WebM, MOV and the existing backend container/audio formats are available; blank selection preserves the source extension. Output names and the source→target display reflect the selected format.

All submissions still use `mode=remux`: incompatible codecs fail instead of silently transcoding. Audio-only targets intentionally retain audio only. The local worker supports a subset of backend containers and retains its size/time limits, cancellation and explicit consent before server fallback. Subtitles, chapters and attachments remain outside its preservation contract.

Real FFmpeg-generated fixtures passed MP4→MKV→MP4, MP4→MOV/M4V, WebM→MKV→WebM, audio extraction and incompatible/malformed-input checks.

## Validation and deployment limits

- Production build, lint, cache/CSP verification, 107 JavaScript/static/media/security checks and 129 backend tests passed during this work.
- Headless Chromium regression passed using synthetic separator output and the real Web Audio player: no eager player, one shared player, device-only MP4→MKV with no upload, explicit start and 390px layouts. This test does not run the neural model.
- At this review's initial checkpoint, eight desktop security-boundary tests passed and the wider suite had harness failures. The [subsequent whole-repository review](full-code-audit-2026-11-02.md) repairs the isolated test fixtures and confirms **24/24 desktop checks pass**. This still does not establish installed-app/installer behavior.
- CI now audits npm web/desktop locks at high severity and runs the real remux/localization media tests with FFmpeg.

These are local source changes. A live backend deployment and a newly built/distributed Windows installer are required to protect existing installations. No server restart, release publication or live configuration change is part of this recorded validation.
