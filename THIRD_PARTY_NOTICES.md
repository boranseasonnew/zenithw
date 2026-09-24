# Third-Party Notices

ZenithW uses third-party software and libraries. Those components are **not relicensed under ZenithW's AGPL-3.0-only license**; each remains subject to its own license and copyright terms.

Key runtime components include:

- **Mediabunny 1.56.1** — Mozilla Public License 2.0. The local-file processing worker bundles this library without upstream source modifications. License: [mediabunny-LICENSE.txt](frontend/vendor/mediabunny-LICENSE.txt). Corresponding source: [npm package 1.56.1](https://www.npmjs.com/package/mediabunny/v/1.56.1), including its `src/` directory. The bundle is reproducible with the checked-in package lock and `scripts/build-local-media.mjs`.

- **yt-dlp** — distributed under its applicable upstream licensing terms (the source/PyPI distribution is primarily Unlicense; bundled builds may include components under additional licenses).
- **FFmpeg** — licensed by the upstream project under LGPL-2.1-or-later by default, or GPL-2.0-or-later for builds configured with GPL components. The exact terms depend on the FFmpeg build in use.
- **Flask** — BSD-3-Clause.
- **Flask-CORS** — MIT.
- **Flask-SocketIO** — MIT.
- **gevent** — MIT.
- **Gunicorn** — MIT.
- **Requests** — Apache-2.0.
- **Deno** — MIT.
- **Brotli** — MIT.
- **Mutagen** — GPL-2.0-or-later.
- **PyCryptodomeX / PyCryptodome** — BSD/Public Domain components; see upstream distribution for complete notices.
- **websockets** — BSD-3-Clause.
- **psutil** — BSD-3-Clause.

This file is a convenience summary, not a replacement for the license files and notices shipped by each upstream project. Transitive dependencies may carry additional licenses. When redistributing ZenithW together with third-party binaries or packages, preserve and provide all notices required by those components' licenses.

For authoritative terms, consult the license information distributed with the exact dependency and version being used.
