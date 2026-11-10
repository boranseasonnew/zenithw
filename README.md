<p align="center">
  <img src="frontend/zenithw.png" width="96" height="96" alt="ZenithW logo">
</p>

<h1 align="center">ZenithW</h1>

<p align="center">
  Save media. Keep it simple.<br>
  <a href="https://zenithw.space">Web app</a> · <a href="https://github.com/boranseasonnew/zenithw/releases/latest">Windows</a> · <a href="https://github.com/boranseasonnew/zenithw-android/releases/latest">Android</a>
</p>

<p align="center">
  <a href="https://zenithw.space"><img src="https://img.shields.io/badge/Web-v17.0-7C3AED?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;logo=html5" alt="ZenithW Web v17.0"></a>
  <a href="https://github.com/boranseasonnew/zenithw/releases/latest"><img src="https://img.shields.io/github/v/release/boranseasonnew/zenithw?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=Windows&amp;logo=electron&amp;color=2563EB" alt="Windows latest release"></a>
  <a href="https://github.com/boranseasonnew/zenithw-android/releases/latest"><img src="https://img.shields.io/github/v/release/boranseasonnew/zenithw-android?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=Android&amp;logo=android&amp;color=2E7D32" alt="Android latest release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0--only-64748B?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white" alt="AGPL-3.0-only license"></a>
</p>

<p align="center">
  <a href="https://github.com/boranseasonnew/zenithw/releases"><img src="https://img.shields.io/github/downloads/boranseasonnew/zenithw/total?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=PC%20downloads&amp;logo=github&amp;color=7C3AED" alt="PC GitHub release asset downloads, all releases"></a>
  <a href="https://github.com/boranseasonnew/zenithw-android/releases"><img src="https://img.shields.io/github/downloads/boranseasonnew/zenithw-android/total?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=Android%20downloads&amp;logo=android&amp;color=2E7D32" alt="Android GitHub release asset downloads, all releases"></a>
</p>

<p align="center"><sub>Download badges count GitHub release asset downloads across all releases, not unique users or Microsoft Store installs.</sub></p>

[English](README.md) · [Türkçe](README.tr.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh.md) · [日本語](README.ja.md)

Web v17.0 · ZenithW Desktop v4.2.0 · Android v3.1.1

[Zenith Type](https://zenithw.space/typing) adds typing practice and duels. Ranked play supports Elo up to 50,000, mutual rematches and match history with head-to-head records. An account is required for online play. See the [typing documentation](docs/TYPING.md) for rules and deployment status. WPM standings and ranked duel Elo reset every 30 days, with a live season countdown. Private-room hosts can edit settings before a match. The owner-only correct-key assist can be toggled during play. Private rooms use a separate, permanent Elo shown on profiles; it never affects the ladder.

ZenithW is an open-source media downloader with tools for audio extraction, conversion and remuxing. No ads, subscription or mandatory account.

Paste a supported link, choose a format and download the file. Available formats depend on the source.

## What changes in web 17.0

- A more responsive [audio separator](https://zenithw.space/audio-separator): cooperative waveform preparation, playback memory on demand, and cancellable WAV/ZIP export. MP3 and FLAC remain available.
- [Remux](https://zenithw.space/remux) lets you choose the destination before starting, including MKV ↔ MP4 for compatible streams. Incompatible codecs need conversion.
- Clearer media-tool guidance and search metadata across eight website languages, with repaired navigation links.
- Dependency security updates, bounded thumbnail requests and protection against concurrent Type avatar changes. Server and installed-app changes require their own deployments.

The separator runs on your device: up to 96 MiB and a four-minute section, with a first-use model/runtime download. Speed depends on your device. Web 17.0 keeps Windows and Android version numbers separate.

[Release notes](https://zenithw.space/updates) · [Security and validation report](docs/full-code-audit-2026-11-02.md)

## Project

- [Web interface](frontend/) and [API](backend/)
- [Windows app](desktop/) · [Android source](https://github.com/boranseasonnew/zenithw-android)

## Documentation

- [Usage and limitations](docs/USAGE.md)
- [Self-hosting and development](docs/SELF_HOSTING.md)
- [On-device media processing](docs/LOCAL_MEDIA.md)
- [Service status](https://zenithw.space/status) · [Updates](https://zenithw.space/updates)

YouTube downloads are disabled on the public web service. Desktop, Android and self-hosted installations use their own connections; source restrictions still apply.

## Responsible use

Download only content you own or have permission to use. Respect platform terms and copyright. ZenithW is not affiliated with the supported platforms.

Web download history stays in your browser; prepared files expire on the server. ZenithW is not permanent cloud storage.

## Contributing

Bug reports, translations and pull requests are welcome. Read the [contributing guide](CONTRIBUTING.md), or open an [issue](https://github.com/boranseasonnew/zenithw/issues).

## Thanks

Built with yt-dlp, FFmpeg, Mediabunny and other open-source projects. Thanks to their maintainers and everyone contributing to ZenithW.

## License

[AGPL-3.0-only](LICENSE). Third-party components retain their own licenses; see [third-party notices](THIRD_PARTY_NOTICES.md).
