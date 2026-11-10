<p align="center">
  <img src="frontend/zenithw.png" width="96" height="96" alt="ZenithW logo">
</p>

<h1 align="center">ZenithW</h1>

<p align="center">
  Save media. Keep it simple.<br>
  <a href="https://zenithw.space">Web app</a> · <a href="https://github.com/boranseasonnew/zenithw/releases/latest">Windows</a> · <a href="https://github.com/boranseasonnew/zenithw-android/releases/latest">Android</a> · <strong><a href="why_zenithw.md">Why ZenithW?</a></strong>
</p>

<p align="center">
  <a href="https://zenithw.space"><img src="https://img.shields.io/badge/Web-v17.0-7C3AED?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;logo=html5" alt="ZenithW Web v17.0"></a>
  <a href="https://github.com/boranseasonnew/zenithw/releases/latest"><img src="https://img.shields.io/github/v/release/boranseasonnew/zenithw?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=Windows&amp;logo=rust&amp;color=2563EB" alt="Windows latest release"></a>
  <a href="https://github.com/boranseasonnew/zenithw-android/releases/latest"><img src="https://img.shields.io/github/v/release/boranseasonnew/zenithw-android?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=Android&amp;logo=android&amp;color=2E7D32" alt="Android latest release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0--only-64748B?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white" alt="AGPL-3.0-only license"></a>
</p>

[English](README.md) · [Türkçe](README.tr.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh.md) · [日本語](README.ja.md)

Web v17.0 · ZenithW Desktop v5.0.0 · Android v3.1.1

ZenithW is an open-source media downloader with tools for audio extraction, conversion and remuxing. No ads, subscription or mandatory account.

Paste a supported link, choose a format and download the file. Available formats depend on the source.

> **[Why ZenithW exists](why_zenithw.md)** — Boran explains the project’s inspiration, the balance between simplicity and control, and why the app stays ad-free.

**GitHub app downloads: 240 total** · [53 Windows](https://github.com/boranseasonnew/zenithw/releases) · [187 Android](https://github.com/boranseasonnew/zenithw-android/releases). Snapshot from 11 November 2026 (Türkiye time). Counts are file downloads across public releases and exclude checksums and Microsoft Store installs.

## Windows: ZenithW Desktop 5.0

ZenithW Desktop now runs on Rust and Microsoft Edge WebView2, with Electron removed. It keeps video and audio downloads, playlists, the queue, trimming, subtitles, square covers, profiles and history on your device. The v5 installer is **116.5 MB**, about **46% smaller** than v4.2. Media transfer and conversion times still depend on the source, connection and hardware.

Choose White, Black, Neon Purple or the Windows theme in Settings. **About** explains how the app works and which data stays on your device. **What’s New** covers the Rust move and the v5 changes in Turkish, English, German and Russian.

[Windows installer and portable ZIP](https://github.com/boranseasonnew/zenithw/releases/tag/v5.0.0) · [Desktop documentation](desktop/) · [Microsoft Store listing](https://apps.microsoft.com/store/detail/9NVWM7S7MJP7) · [WinGet submission](https://github.com/microsoft/winget-pkgs/pull/449816)

Windows 10 or 11, x64. To run the portable edition, extract the entire ZIP and open `Zenith.exe`. If you upgrade, you may need to sign in again in the new WebView2 login window.

## What changes in web 17.0

- A more responsive [audio separator](https://zenithw.space/audio-separator): cooperative waveform preparation, playback memory on demand, and cancellable WAV/ZIP export. MP3 and FLAC remain available.
- [Remux](https://zenithw.space/remux) lets you choose the destination before starting, including MKV ↔ MP4 for compatible streams. Incompatible codecs need conversion.
- Clearer media-tool guidance and search metadata across eight website languages, with repaired navigation links.
- Dependency security updates, bounded thumbnail requests and protection against concurrent Type avatar changes. Server and installed-app changes require their own deployments.

The separator runs on your device: up to 96 MiB and a four-minute section, with a first-use model/runtime download. Speed depends on your device. Web 17.0 keeps Windows and Android version numbers separate.

[Release notes](https://zenithw.space/updates) · [Security and validation report](docs/full-code-audit-2026-11-02.md)

[Zenith Type](https://zenithw.space/typing) adds typing practice and duels with ranked seasons, rematches, private rooms and match history. An account is required for online play. See the [typing documentation](docs/TYPING.md) for rules and deployment status.

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
