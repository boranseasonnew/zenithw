# Self-hosting and development

Setup, architecture, API endpoints and operating limits for the ZenithW web service.

[Back to the project](../README.md) · [Usage](USAGE.md)

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

## Self-host with Docker Compose

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
# Set SECRET_KEY in .env to a strong random value before starting.
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

## Local development

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

## Production essentials

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
