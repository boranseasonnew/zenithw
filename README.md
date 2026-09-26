# ZenithW

> A focused, ad-free media workspace for downloading, converting, and remuxing content you are allowed to use. ✨

[Live app](https://zenithw.space) · [Status](https://zenithw.space/status) · [Updates](https://zenithw.space/updates) · [Türkçe](README.tr.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [日本語](README.ja.md)

Current release: **v15.0**

![ZenithW web interface](docs/assets/zenithw-preview.png)

## ✨ Why ZenithW?

ZenithW keeps media work deliberately simple: paste a supported link, review what the source actually provides, choose the output you want, and download the prepared file.

There is no account system, browser extension, paywall, subscription, or advertising layer in the workflow.

Just practical media tools, clear controls, and honest limitations.

- **One focused workspace** for downloads, audio extraction, conversion, and remuxing.
- **Privacy-minded by default:** browser history remains local and prepared files expire automatically.
- **Honest controls:** a selected profile is a preference, not a promise that every source provides every format.
- **No advertising layer:** ZenithW does not insert ads into the download workflow.
- **Ready to self-host:** Docker Compose can run the complete interface and API on your own machine or server. 🐳

## What it does

ZenithW works with supported yt-dlp-compatible media sources.

The public service currently supports platforms such as:

- TikTok
- Instagram
- X
- Reddit
- and other compatible sources supported by the active yt-dlp integration

ZenithW can:

- Download video and audio.
- Extract audio from media.
- Download muted video where supported.
- Process playlists and small batches of links.
- Convert files using FFmpeg.
- Remux compatible audio and video streams without unnecessary re-encoding.
- Download subtitles.
- Preserve supported metadata.
- Download and embed thumbnails.
- Use SponsorBlock where available.
- Cancel active jobs.
- Show live processing progress.
- Keep download history locally in the browser instead of requiring a server-side account.

> **YouTube notice:** YouTube downloads are currently disabled on the public ZenithW website because of upstream access restrictions affecting hosted and datacenter-based web requests. See the **YouTube availability** section below.

ZenithW is built around a short and inspectable workflow:

1. Paste a supported link.
2. Review media information and available formats.
3. Configure the output.
4. Start the job.
5. Download the prepared file directly from the browser.

No account, browser extension, or desktop application is required for the web version.

## Download controls

The main download interface supports:

- Automatic format selection
- Video downloads
- Audio extraction
- Muted video
- Playlist handling
- Small batches of links
- Resolution selection
- Container selection
- Codec preferences
- Audio bitrate selection
- Subtitle options
- Metadata embedding
- Thumbnail handling
- Filename templates
- SponsorBlock controls

Available options depend on what the source platform actually exposes.

ZenithW does not invent formats that are unavailable from the original source.

### Download profiles

ZenithW includes three practical profiles.

#### Minimal

Designed for smaller files, faster transfers, broad compatibility, and limited storage.

#### Standard

Designed for a balanced experience with broadly compatible video and audio settings.

Typical target:

- 1080p
- H.264
- MP4
- 192 kbps audio

Actual output depends on the available source streams.

#### Quality

Prefers higher-quality streams where available.

Possible preferences include:

- High resolution
- AV1
- WebM
- Opus audio

Again, the selected profile is a preference rather than a guarantee.

Third-party platforms decide which streams are actually available.

## Media tools

ZenithW includes local-file media tools alongside link downloads.

### Convert

Convert uploads a local file and processes it with FFmpeg using the selected target format.

It is useful when a media file needs:

- another container
- another audio format
- broader device compatibility
- a simpler output format

### Remux

Remux copies compatible audio and video streams into another container without re-encoding them.

This can be significantly faster than a full conversion and avoids unnecessary quality loss.

Remuxing only works when the original streams are compatible with the target container.

Both Convert and Remux:

- show processing progress
- return temporary prepared files
- do not act as permanent cloud storage
- operate under server-side size and processing limits

## On-device processing · Beta

Convert and Remux include experimental device-side processing modes.

Available modes:

- **Server**
- **Prefer this device**
- **Only this device**

The device-side beta can copy compatible media streams without re-encoding and may also extract compatible audio locally.

### Server

Processing is performed on the ZenithW backend.

This remains the default.

### Prefer this device

ZenithW first attempts compatible processing on the current device.

If local processing fails, the user must explicitly approve uploading the file to the server.

### Only this device

The file is never uploaded to the ZenithW server.

If the device cannot process the requested job, the job fails locally.

### Current device-side limits

- Desktop: up to **64 MiB**
- Mobile / low-memory devices: up to **24 MiB**
- Maximum media duration: **30 minutes**

The current beta does not preserve:

- subtitles
- chapters
- attachments

Link-based downloads still use the backend.

See:

[Local media processing documentation](docs/LOCAL_MEDIA.md)

## YouTube availability

YouTube downloads are currently **disabled on the public ZenithW service**.

The reason is not a normal ZenithW application failure.

YouTube currently applies access restrictions that can affect requests originating from hosted web infrastructure, cloud servers, and datacenter IP ranges.

ZenithW's public backend runs on hosted infrastructure, which means requests to YouTube may be treated differently from requests coming from a normal residential device or browser.

As a result, YouTube may reject or restrict requests even while:

- ZenithW itself is working correctly
- yt-dlp is operational
- FFmpeg is available
- the backend is healthy
- the media pipeline is functioning normally

### Approaches that were tested

Multiple application-side approaches were tested in an attempt to keep YouTube access reliable.

These included:

- refreshed authenticated cookies
- automatic cookie renewal
- cookie refresh services
- PO Token integration
- PO Token generation services
- yt-dlp updates
- extractor updates
- session changes
- request adjustments

Some of these approaches could temporarily improve individual requests.

However, none of them provided sufficiently reliable access for the public ZenithW service.

### Why cookies and PO Tokens were not enough

Cookies and PO Tokens can help with some YouTube access conditions, but they do not control every factor involved in whether a request is accepted.

YouTube may also evaluate factors such as:

- datacenter or cloud IP reputation
- request origin
- account state
- session state
- authentication requirements
- platform-side rate limits
- abuse-prevention systems
- regional restrictions
- rapidly changing platform behavior

Because of this, a valid cookie or PO Token does **not** guarantee successful access from a public cloud-hosted backend.

ZenithW does not present these mechanisms as universal bypasses.

### Why public YouTube support was disabled

Repeatedly sending requests through the same hosted infrastructure would create unnecessary failures without providing a dependable user experience.

It could also increase pressure on the shared backend IP while still failing to solve the underlying platform-side restriction.

For that reason, YouTube access on the public ZenithW website was intentionally disabled.

### Is YouTube permanently removed?

No.

YouTube support has **not been permanently removed from the ZenithW project**.

It may return to the public service if a reliable and maintainable approach becomes available.

The current restriction specifically affects the hosted public ZenithW deployment.

### Self-hosted installations

Self-hosted ZenithW installations use their own:

- IP address
- network connection
- yt-dlp installation
- authentication state
- cookies
- optional token configuration

Because of this, YouTube behavior on a self-hosted installation may differ from the public ZenithW service.

Self-hosting does not guarantee YouTube access either.

Availability still depends on YouTube's own access rules and the network environment of the installation.

## Platform availability

Support for any third-party website should be considered best-effort.

A job may fail because of conditions outside ZenithW's control, including:

- deleted media
- private media
- age restrictions
- login requirements
- regional restrictions
- unavailable formats
- rate limits
- upstream API or site changes
- platform-side anti-abuse systems
- network restrictions
- removed content

ZenithW attempts to report these conditions instead of presenting unavailable output as a successful download.

## User experience and privacy

ZenithW keeps the interface lightweight.

The application provides:

- live progress
- cancellation
- browser-local history
- responsive desktop navigation
- responsive mobile navigation
- multiple interface languages
- no mandatory user account

Prepared files exist only for a limited transfer window.

Download links are:

- temporary
- tied to the requesting client where applicable
- automatically removed after use or expiration

ZenithW is not intended to operate as permanent online media storage.

### Browser-local history

Download history is stored in the browser rather than in a ZenithW account.

This allows basic convenience without requiring users to register.

Clearing browser data may also clear this local history.

## Architecture

| Layer | Runtime |
|---|---|
| Frontend | Vanilla HTML, CSS, and JavaScript on Cloudflare Pages |
| Edge | Cloudflare DNS, proxy, TLS, and origin verification |
| Backend | Flask, Gunicorn, gevent, and Socket.IO on Amazon EC2 |
| Media | yt-dlp, FFmpeg, Deno/EJS, and optional token integrations |
| Service management | Ubuntu, Nginx, and systemd |

The backend intentionally runs as a **single worker**.

Current job state, Socket.IO rooms, and prepared-file ownership are process-local.

Scaling to multiple workers or replicas would require shared coordination and storage first.

## 🐳 Self-host with Docker Compose

The quickest way to run a complete ZenithW instance is Docker Compose.

It runs:

- the frontend
- the reverse proxy
- the API
- FFmpeg
- the download workspace
- persistent temporary storage

The default installation intentionally keeps a **single backend worker**.

This matches ZenithW's current job, progress, cancellation, and prepared-file model.

```bash
git clone https://github.com/boranseasonnew/zenithw.git
cd zenithw
cp .env.example .env
docker compose up -d --build
```

Then open:

```text
http://localhost:8080
```

If another port or public domain is used, update both:

- `ZENITHW_PORT`
- `SELF_HOSTED_ORIGIN`

inside `.env`.

Then restart:

```bash
docker compose up -d
```

## Docker storage

The `zenithw-downloads` Docker volume stores temporary processing files.

These files are still cleaned up by ZenithW's normal expiry system.

The persistent volume exists mainly so container updates do not immediately interrupt an active transfer window.

It should not be treated as permanent media storage.

## Optional private cookies

Some supported sources may require an authenticated browser session.

A private cookie file can optionally be supplied to a self-hosted installation.

```bash
mkdir -p private
```

Place your own Netscape-format cookie export at:

```text
private/cookies.txt
```

Then:

```bash
cp compose.cookies.example.yml compose.cookies.yml
docker compose -f compose.yml -f compose.cookies.yml up -d
```

Files such as:

```text
private/cookies.txt
compose.cookies.yml
```

must never be committed to Git or shared publicly.

Cookies are optional and should remain private.

They are also **not** a universal bypass for third-party platform restrictions.

## Public hosting

For public hosting, place HTTPS and an appropriate firewall or reverse proxy in front of the Docker deployment.

Cloudflare is used by the official ZenithW infrastructure, but Cloudflare is not required for self-hosting.

A self-hosted deployment may use another trusted reverse proxy or network configuration.

## 🛠️ Local development

### Requirements

- Python 3.10+
- FFmpeg
- Modern web browser

Clone the repository:

```bash
git clone https://github.com/boranseasonnew/zenithw.git
cd zenithw/backend
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate the environment using the appropriate command for your operating system.

Then install the locked dependencies:

```bash
pip install --require-hashes -r requirements.lock
```

Start the backend:

```bash
python app.py
```

The API starts at:

```text
http://localhost:5000
```

Serve the `frontend/` directory with any static file server.

Development CORS should only be enabled for local cross-origin development.

Do not leave development CORS settings enabled unnecessarily in production.

## 🔐 Production essentials

Production deployments require strong private values for:

```text
SECRET_KEY
ORIGIN_SECRET
```

Runtime limits, temporary-file budgets, trusted-proxy behavior, concurrency controls, and diagnostics access are configured using the environment variables documented in the backend.

Important production rules:

- Keep secrets out of Git.
- Keep exported cookies out of Git.
- Keep private browser data private.
- Keep the EC2 origin protected behind the configured proxy chain.
- Verify the shared origin secret where configured.
- Only trust visitor headers from trusted proxy infrastructure.
- Keep diagnostics private.
- Keep public health responses minimal.
- Do not increase backend worker count without first implementing shared job state and file coordination.

## Main endpoints

| Endpoint | Purpose |
|---|---|
| `POST /info` | Resolve metadata and available formats |
| `POST /download` | Start a download or extraction job |
| `POST /convert` | Convert or remux an uploaded file |
| `POST /cancel` | Cancel an active job |
| `GET /files/<token>` | Transfer a temporary prepared file |
| `GET /health` | Minimal liveness response |
| `GET /ready` | Dependency and capacity readiness |

## Security

ZenithW places limits around remote media processing rather than treating arbitrary internet input as automatically trusted.

The application includes protections such as:

- remote target validation
- blocking private destinations
- blocking link-local destinations
- redirect constraints
- media protocol restrictions
- concurrency limits
- processing limits
- disk usage limits
- temporary file expiry
- short-lived file tokens
- restricted prepared-file delivery

No internet-facing service can guarantee absolute anonymity, unrestricted availability, or complete protection from all third-party platform changes.

ZenithW instead attempts to minimize retained data and limit the lifetime and scope of temporary processing.

## Responsible use

Use ZenithW only for content that:

- you own
- you have permission to download
- you are legally permitted to use

Third-party platform terms and applicable copyright rules remain the user's responsibility.

ZenithW is not affiliated with YouTube, TikTok, Instagram, X, Reddit, or other supported platforms.

Support for a platform does not imply endorsement, partnership, or official integration.

## Bug reports

Reproducible bugs can be reported through:

[GitHub Issues](https://github.com/boranseasonnew/zenithw/issues)

When reporting an issue:

- describe the problem clearly
- include reproducible steps where possible
- mention the relevant ZenithW version
- include useful error information
- remove private or identifying information

Never include:

- cookies
- passwords
- private URLs
- authentication tokens
- API secrets
- personal data

in a public GitHub issue.

## License

- **ZenithW:** AGPL-3.0-only
- **Third-party dependencies:** their respective licenses
- Additional information: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
