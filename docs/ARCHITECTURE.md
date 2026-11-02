# ZenithW application structure

The 2 November 2026 refactor keeps Flask, Socket.IO and vanilla JavaScript. Public API paths and download policies remain unchanged. Source organization is independent of the web release number. The subsequent requested UI adjustment keeps the existing visual style while adding a shared Tools menu and a single-viewport homepage.

## Backend

`backend/app.py` remains the Gunicorn entry point (`app:app`). It creates the application and exposes its Socket.IO instance; it contains no download or conversion implementation. Existing Docker, systemd and Procfile entry commands continue to work. Deploy the complete `backend/` directory, including `zenith/`, rather than copying only `app.py`.

```text
backend/zenith/
  config.py           Environment validation and maintenance settings
  factory.py          Flask, CORS, Socket.IO, hooks and route registration
  runtime.py          One application's collaborators and background lifecycle
  routes/             Media/files Blueprints and system endpoints
  security/           Request policy, DNS-pinned networking and public errors
  jobs/               Queue slots, cancellation, Socket.IO owners and TTL limits
  services/           Metadata, downloads, thumbnails, conversion and file storage
```

Each application has a separate `Runtime` at `app.extensions['zenith']`. Queue counters, cancellation events, prepared files, spool reservations, metadata caches, limits and connection owners belong to that runtime. Services receive the runtime explicitly and reference collaborators through it; service modules never import the application entry point. Small URL, validation, format and error helpers remain independent functions.

This state is still process-local. The existing production `--workers 1` setting remains intentional; application isolation does not add a distributed queue or make transfer/cancellation state shared between Gunicorn workers.

`create_app(start_background=False, download_dir=...)` creates an isolated application for tests. Normal production startup enables periodic cleanup. `runtime.close()` stops those tasks; repeated startup does not create duplicate cleanup workers. Shutdown retains the previous child-process reaping behavior.

Important invariants:

- The factory applies gevent monkey-patching before importing HTTP, networking and thread-dependent services.
- Flask keeps the original backend `root_path`, so relative prepared-file paths continue to resolve correctly after the package move.
- Global socket dispatchers are installed once. Their DNS cache and optional private-provider permissions use the active request's network policy. Off-request networking falls back to a public-only policy; a second application cannot replace the first application's provider configuration.
- The origin check, JSON-size limit, maintenance gate and concurrent-request limit retain their order. Response cache/indexing protection and transfer-token ownership checks remain in effect.
- Background cleanup starts only after all services and shared state exist. Importing a service does not create a Flask application or start cleanup tasks.

## Browser application

The maintained source is now `shared/web-app/`. Edit those modules rather than the generated `frontend/app.d4596317c4a7.js` file.

```text
shared/web-app/
  index.mjs           Explicit compatibility surface and startup order
  state.mjs           Shared mutable workflow state
  api.mjs             Socket connection, transfer and API handoff helpers
  metadata.mjs        URL inspection and stale-result cancellation
  download.mjs        Single-download orchestration
  bulk.mjs, queue.mjs Bulk and playlist workflows
  settings.mjs        Preferences, profiles, theme and filename settings
  media-tools.mjs     Remux and conversion controls
  language.mjs        Existing translations and language updates
  progress.mjs        Download panel and progress rendering
  save.mjs            File, native-share and clipboard handoffs
  ui.mjs, input.mjs   Existing overlays, focus, feedback and input interactions
  history.mjs         Browser-local history
  errors.mjs          Public error presentation
  bootstrap.mjs      Application and reminder initialization
```

The existing esbuild dependency bundles these ES modules into one classic browser script. HTML callbacks remain available through an explicit compatibility surface in `index.mjs`; newly exported module helpers do not automatically become globals. Mutable shared fields have one owner in `state.mjs`. Feature modules can reference live function imports, but DOM work, socket binding and startup effects run through ordered initialization calls after imports finish. Keep new import-time code free of DOM work or cross-feature initialization.

This does not add React, client-side page routing, hydration or extra module-fetch round trips. Existing static eight-language HTML, CSS, workers, CSP and hashed asset delivery remain in use. This refactor makes maintenance easier; it does not establish faster metadata extraction, neural inference or search ranking.

## Build and test

From the repository root:

```sh
npm run build:app
npm run build
npm run lint
npm run check:cache
npm run check:release-content
node --test tests/*.test.mjs tests/desktop-security.test.cjs desktop/tests/*.test.cjs
```

`build:app` regenerates the browser bundle. The complete build also refreshes asset references/CSP. Lint verifies that the committed bundle matches the maintained modules, so changes cannot silently ship with an old generated script. No root npm/pnpm dependency specification or lock changed during this refactor.

In an environment with the locked backend requirements and FFmpeg installed:

```sh
cd backend
python -m unittest discover -s tests -v
```

Factory integration tests run in subprocesses because gevent patches process-wide APIs. They exercise real Flask/Blueprint/Socket.IO wiring, per-application state, production origin checks, metadata caching, actual FFmpeg remux, token ownership and transfer cleanup using both absolute and relative workspaces. Media-provider metadata is mocked; no real provider download is part of those tests.

Legacy focused tests still inject fake collaborators into actual modular function bodies through `tests/source_support.py`. Their static safeguard assertions normalize collaborator prefixes; they are not a substitute for the separate integration tests above. Frontend isolated tests likewise inspect maintained module source, while browser regressions execute the real generated bundle.

With an available Playwright installation/browser, run `node tests/app-modules-browser.mjs` and `node tests/media-tools-browser.mjs`. `PLAYWRIGHT_MODULE` and `BROWSER_EXECUTABLE` can point to existing installations. These are manual local checks, not currently part of the hosted workflow. The separator regression uses synthetic stem output and real playback/export, not neural inference.

## Recorded validation

| Check | Result |
| --- | --- |
| Existing backend regressions | 133 passed before extraction |
| Backend after extraction, including real factory integrations | 136 passed |
| Node website/media/security/desktop suite | 134 passed |
| Production website build and bundle consistency | Passed |
| Browser metadata cancellation/race, settings persistence, theme and modal callbacks | Passed |
| Browser audio playback, WAV/ZIP export, local remux and localized release navigation | Passed |
| Main/settings/remux/convert desktop and mobile geometry/text/control comparison | Eight views unchanged |
| CSS changes | None |
| HTML content/layout changes after ignoring regenerated asset hashes | None |

The original browser source was 152,519 bytes (45,191 bytes with local gzip). The generated modular bundle is 174,885 bytes (46,827 with the same gzip method), an approximately 1.6 KiB compressed increase for explicit state/compatibility wiring. Actual CDN compression and device startup time were not benchmarked. Source-file splitting is not a performance claim.

There was no production deployment or new Windows/Android release during this local refactor. Windows/Linux service behavior on a live server and real provider downloads were not tested here.

## Homepage navigation adjustment

The eight-view comparison above records the extraction checkpoint before the requested UI change. At that checkpoint, the Type and separator links were below the first screen. The shared bottom/desktop-side navigation now has a Tools popover containing vocal separation, Type, remux and conversion, with eight-language labels. Remux and conversion no longer have separate primary-navigation entries. The popover supports native keyboard/light dismissal and a fallback for older browsers.

The homepage's generated discovery/guide content, separate separator link and service-active label were removed at their generators. Existing guide pages remain available. The homepage fits one viewport with internal scrolling for playlist results and dialogs; other pages retain their scrolling. A screen-reader heading and existing search metadata remain. Shared navigation script URLs are versioned during language generation to avoid reusing the old menu from browser caches.

## Primary references

- [Flask Blueprints](https://flask.palletsprojects.com/en/stable/blueprints/) and [application factories](https://flask.palletsprojects.com/en/stable/patterns/appfactories/).
- [Flask-SocketIO initialization and event registration](https://flask-socketio.readthedocs.io/en/latest/getting_started.html).
- [esbuild build, external imports and output verification](https://esbuild.github.io/api/).
