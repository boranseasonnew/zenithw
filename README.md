# ZenithW

> A focused, ad-free media workspace for downloading, converting, and remuxing content you are allowed to use. ✨

[Live app](https://zenithw.space) · [Status](https://zenithw.space/status) · [Updates](https://zenithw.space/updates) · [Türkçe](README.tr.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [日本語](README.ja.md)

Current release: **v14.4**

![ZenithW web interface](docs/assets/zenithw-preview.png)

## ✨ Why ZenithW?

ZenithW keeps media work deliberately calm: paste a link, review what the source actually offers, choose a sensible output, and save the prepared file. There is no account system, browser extension, paywall, or ad layer in the workflow — just practical tools and clear limits.

- **One focused workspace** for downloads, audio extraction, conversion, and remuxing.
- **Privacy-minded by default:** history stays in the browser and prepared files expire.
- **Honest controls:** a profile is a preference, not a fake promise that every source has every format.
- **Ready to self-host:** Docker Compose runs the complete interface and API together on your own machine or server. 🐳

## What it does

- Resolves media from YouTube, TikTok, Instagram, X, Reddit, and other yt-dlp-compatible sources.
- Downloads video, audio, muted video, playlists, and small link batches.
- Converts with FFmpeg and remuxes compatible streams without unnecessary re-encoding.
- Supports subtitles, metadata, thumbnails, SponsorBlock, cancellation, and live progress.
- Keeps download history in the browser rather than in a server-side account.
- Provides a responsive, framework-free interface in Turkish, English, French, and German.

ZenithW is designed around a short, inspectable workflow: paste a supported link, review the media details and available choices, then prepare a file for a direct browser download. It does not require an account, a browser extension, or a desktop client. The interface stays deliberately compact while exposing the decisions that matter for a media job.

## Download controls

The home screen supports automatic selection, audio extraction, muted video, playlist handling, and small batches of links. Where a source exposes multiple formats, ZenithW lets the user choose the container, resolution, codec preference, audio bitrate, subtitles, metadata, thumbnail, filename pattern, and SponsorBlock behavior before starting the job.

Settings include three practical download profiles:

- **Minimal** prefers smaller, broadly compatible files for quick sharing and limited storage.
- **Standard** targets a balanced 1080p H.264/MP4 video and 192 kbps audio experience.
- **Quality** prefers high-resolution AV1/WebM video with Opus audio when the source actually provides it.

The profile is a starting point, not a promise that every platform or video has that exact stream. For YouTube video jobs, the server enforces a 720p ceiling while busy and allows up to 1080p only while idle. Format fallbacks cannot silently escape that ceiling, and the selected video stream dimensions are checked against the effective limit. Audio downloads and non-YouTube sources keep their own selection flow.

## Media tools

ZenithW includes two local-file tools alongside link downloads:

- **Convert** uploads a file for a bounded FFmpeg conversion with an explicit target format. It is useful when a file needs a different, device-friendly container or audio format.
- **Remux** copies compatible audio and video streams into a new container without re-encoding. It is faster and avoids avoidable quality loss, but only works where the source streams are compatible with the requested container.

Both tools show their processing state and return a short-lived prepared file rather than keeping an archive of uploads. Upload size, output size, duration, concurrency, and processing time are limited on the server so one conversion cannot consume the service indefinitely.

### On-device processing · Beta

Convert and Remux offer **Server**, **Prefer this device**, and **Only this device**. The beta copies compatible audio/video streams without re-encoding; it can repackage media and extract compatible audio. Server remains the default. Failed local jobs require explicit approval before upload, and Only this device never uploads. Limits: 64 MiB on desktop, 24 MiB on mobile/low-memory devices, and 30 minutes. Subtitles, chapters and attachments are not preserved. Link downloads still use the backend. See [scope, limits and build instructions](docs/LOCAL_MEDIA.md).

## YouTube availability

YouTube downloads are provided on a best-effort basis. YouTube may temporarily apply stricter checks or block requests from datacenter IP ranges, including cloud-hosted servers such as AWS. When that happens, the result may look like a download failure even though the ZenithW application and its download pipeline are operating normally.

Within the current integration, no application-side change can guarantee uninterrupted YouTube access while the upstream service is restricting a server IP. This does not mean that YouTube support has been removed or disabled in ZenithW. YouTube downloads will remain enabled while we monitor the situation and wait for a meaningful upstream or network-level improvement.

To reduce avoidable pressure on the shared AWS address, ZenithW coalesces simultaneous metadata lookups for the same link, serves recent successful analysis results from a short-lived cache, applies separate per-visitor and host-wide YouTube request budgets, suppresses duplicate download starts, and pauses further upstream attempts after a real HTTP 429 response. These controls reduce unnecessary traffic; they cannot override YouTube's own access decisions.

Please keep this limitation in mind: ZenithW may not always provide a continuous download service, and YouTube availability is not guaranteed at all times. Videos can also remain unavailable because of privacy settings, regional restrictions, deleted content, login requirements, or platform-side rate limits. These conditions are outside ZenithW's control.

## User experience and privacy

ZenithW keeps the operational UI lightweight: live progress, cancellation, a browser-local history, responsive desktop and mobile navigation, and language support without a user account. The server prepares a file only for the transfer window; prepared download links are short-lived, tied to the requesting client, and removed after use or expiry.

No feature should be read as a guarantee that a third-party platform will expose a particular format or accept every request. Platform-side restrictions, deleted media, private posts, regional rules, login requirements, and rate limits can still prevent a job from completing. ZenithW reports those boundaries instead of silently presenting unavailable output as a completed download.

## Architecture

| Layer | Runtime |
|---|---|
| Frontend | Vanilla HTML, CSS, and JavaScript on Cloudflare Pages |
| Edge | Cloudflare DNS, proxy, TLS, and origin verification |
| Backend | Flask, Gunicorn, gevent, and Socket.IO on Amazon EC2 (AWS) |
| Media | yt-dlp, FFmpeg, Deno/EJS, and an optional PO Token provider |
| Service management | Ubuntu, Nginx, and systemd |

The backend intentionally runs as a **single worker**. Job state, Socket.IO rooms, and prepared-file ownership are process-local; adding workers or replicas requires shared coordination and storage first.

## 🐳 Self-host with Docker Compose

The fastest complete setup is Docker Compose. It runs the frontend, reverse proxy, API, FFmpeg, and a persistent download volume together. The default installation intentionally keeps **one backend worker**; this matches ZenithW's current process-local job, progress, cancellation, and prepared-file model.

```bash
git clone https://github.com/boranseason/zenithw.git
cd zenithw
cp .env.example .env
docker compose up -d --build
```

Open `http://localhost:8080`. Change `ZENITHW_PORT` and `SELF_HOSTED_ORIGIN` together in `.env` if you use another local port or a public domain, then restart with `docker compose up -d`.

The `zenithw-downloads` Docker volume holds temporary processing files. They are still removed by ZenithW's normal expiry cleanup; the volume exists so container updates do not interrupt an active transfer window.

### Optional private cookies

Some sources can require a signed-in browser session. This is optional and should remain private:

```bash
mkdir -p private
# Put your own Netscape-format export at private/cookies.txt.
cp compose.cookies.example.yml compose.cookies.yml
docker compose -f compose.yml -f compose.cookies.yml up -d
```

`private/cookies.txt` and `compose.cookies.yml` must never be committed or shared. ZenithW works without this override; it is not a universal bypass for platform restrictions.

For public hosting, put HTTPS and your preferred firewall or reverse proxy in front of Docker. Cloudflare is useful for the official deployment, but it is **not required** for a self-hosted install.

## 🛠️ Local development

Requirements: Python 3.10+, FFmpeg, and a modern browser.

```bash
git clone https://github.com/boranseason/zenithw.git
cd zenithw/backend
python -m venv .venv
```

Activate the environment, then run:

```bash
pip install --require-hashes -r requirements.lock
python app.py
```

The API starts on `http://localhost:5000`. Serve `frontend/` with any static file server. Enable development CORS only for local cross-origin work, never in production.

## 🔐 Production essentials

Production requires strong private values for `SECRET_KEY` and `ORIGIN_SECRET`. Runtime limits, trusted-proxy behavior, temporary-file budgets, and diagnostics access are configured through the environment variables documented with their defaults in `backend/app.py`.

- Keep secrets and exported browser data out of Git.
- Keep the EC2 origin behind Cloudflare and verify the shared origin header.
- Trust visitor headers only through the Cloudflare-to-Nginx proxy chain.
- Keep diagnostics private and public liveness responses minimal.
- Do not scale past one worker until job state, Socket.IO routing, and prepared files are shared safely.

## Main endpoints

| Endpoint | Purpose |
|---|---|
| `POST /info` | Resolve metadata and formats |
| `POST /download` | Start a download or extraction job |
| `POST /convert` | Convert or remux an uploaded file |
| `POST /cancel` | Cancel an active job |
| `GET /files/<token>` | Transfer a short-lived prepared file |
| `GET /health` | Minimal liveness response |
| `GET /ready` | Dependency and capacity readiness |

## Security and responsible use

ZenithW validates remote targets, blocks private and link-local destinations, constrains redirects and media-tool protocols, limits concurrency and disk use, and delivers prepared files through short-lived tokens. No internet service can promise absolute anonymity or uninterrupted availability; the project instead minimizes collected data and bounds temporary processing.

Use ZenithW only for content you own, are permitted to download, or may lawfully use. Source-platform terms and copyright rules remain the user's responsibility. ZenithW is not affiliated with supported platforms.

Report reproducible bugs through [GitHub Issues](https://github.com/boranseason/zenithw/issues). Never include secrets, private links, or personal data in public reports.

## License

- ZenithW: AGPL-3.0-only
- Third-party dependencies: their respective licenses
- Details: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
