# Local media processing (beta)

Convert and Remux can process device-selected files in a dedicated browser worker.
Select **Server**, **Prefer this device**, or **Only this device** above the file picker.
Server is the default on every device until the user explicitly selects another mode.

The beta copies compatible encoded audio/video tracks without re-encoding. It can
repackage supported streams and extract compatible audio. It does not add quality,
change codecs, or locally process URL downloads. YouTube extraction, merging of
separate remote streams, and heavy transcoding still use the existing backend.

## Boundaries

- Desktop input limit: 64 MiB; mobile or reported memory below 4 GiB: 24 MiB.
- Maximum input duration: 30 minutes. Entire local job deadline: 120 seconds.
- Output is capped at twice the input allowance (maximum 128 MiB).
- Supported targets: MP4, M4V, M4A, MOV, WebM, MKV, MP3, Ogg, Opus, FLAC, WAV and AAC.
  A target being listed does not mean the source codec can be copied into it.
- Re-encoding is forbidden in the local worker. An incompatible or discarded required
  audio/video track fails the job. The output is reopened and checked for track count,
  track codecs and duration before it reaches the save dialog.
- Subtitles, chapters, attachments and arbitrary metadata are not guaranteed to survive.
  Use server processing when preserving these is required.
- Secure contexts (HTTPS or localhost) and module workers are required.
- Cancel terminates the worker. Closing or reloading the page loses the local job.
- Preferred mode offers an explicit upload button after failure. Only-device mode
  never falls back to an upload. File selection alone never sends a local job to AWS.

## Maintenance

Mediabunny is pinned in `package.json` and `pnpm-lock.yaml`. The committed worker is
self-hosted, lazy-loaded only for local jobs, and needs no WASM permission, external
CDN script, cross-origin isolation, or change to the hosted site's CSP.

```sh
pnpm install --frozen-lockfile
pnpm run build:media
pnpm run test:media
```

Tests require FFmpeg on PATH to generate synthetic fixtures. Rebuild and commit the
worker and license whenever its source or dependency version changes. Browser QA
should cover cancellation, fallback consent, unsupported codecs, a cold load, and
mobile layout. This feature reduces upload and server processing for local files;
it does not change YouTube's access decisions or datacenter IP restrictions.

An optional real-browser regression test is available at `tests/local-media-browser.mjs`.
Serve `frontend` at `http://127.0.0.1:8766`, install Playwright and its Chromium test
browser, then run `node tests/local-media-browser.mjs`. `PLAYWRIGHT_MODULE` can point
to an existing Playwright `index.mjs`. This test injects the repository CSP, blocks
external requests, mocks server responses, and tests local Convert/Remux, failure
consent, cancellation and mobile width without uploading a file to production.
