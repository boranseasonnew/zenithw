<p align="center">
  <img src="frontend/zenithw.png" width="96" height="96" alt="ZenithW logo">
</p>

<h1 align="center">ZenithW</h1>

<p align="center">
  Save media. Keep it simple.<br>
  <a href="https://zenithw.space">Web app</a> · <a href="https://github.com/boranseasonnew/zenithw/releases/latest">Windows</a> · <a href="https://github.com/boranseasonnew/zenithw-android/releases/latest">Android</a>
</p>

<p align="center">
  <a href="https://zenithw.space"><img src="https://img.shields.io/badge/Web-v17.2-7C3AED?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;logo=html5" alt="ZenithW Web v17.2"></a>
  <a href="https://github.com/boranseasonnew/zenithw/releases/latest"><img src="https://img.shields.io/github/v/release/boranseasonnew/zenithw?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=Windows&amp;logo=windows11&amp;color=2563EB" alt="Windows latest release"></a>
  <a href="https://github.com/boranseasonnew/zenithw-android/releases/latest"><img src="https://img.shields.io/github/v/release/boranseasonnew/zenithw-android?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=Android&amp;logo=android&amp;color=2E7D32" alt="Android latest release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0--only-64748B?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white" alt="AGPL-3.0-only license"></a>
</p>

<p align="center">
  <a href="https://github.com/boranseasonnew/zenithw/releases"><img src="https://img.shields.io/github/downloads/boranseasonnew/zenithw/total?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=PC%20downloads&amp;logo=github&amp;color=7C3AED" alt="PC GitHub release asset downloads, all releases"></a>
  <a href="https://github.com/boranseasonnew/zenithw-android/releases"><img src="https://img.shields.io/github/downloads/boranseasonnew/zenithw-android/total?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=Android%20downloads&amp;logo=android&amp;color=2E7D32" alt="Android GitHub release asset downloads, all releases"></a>
</p>

<p align="center"><sub>Download badges show GitHub release file downloads across all releases, not unique users or Microsoft Store installs.</sub></p>

<p align="center"><strong><a href="why_zenithw.md">✦ Why ZenithW? Read our story</a></strong></p>

[English](README.md) · [Türkçe](README.tr.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh.md) · [日本語](README.ja.md)

ZenithW is an open-source media downloader with tools for audio extraction, conversion and remuxing. No ads, subscription or mandatory account.

Paste a supported link, choose a format and download the file. Available formats depend on the source.

## What's new in web 17.2

- **New [Image Converter](https://zenithw.space/image-convert):** convert images between formats including JPEG, PNG, WebP, AVIF, TIFF, BMP, TGA and QOI. More formats are supported by the local processing engine.
- **Resize images precisely:** enter custom width and height values, preview the result and keep control over the output dimensions.
- **A redesigned [Audio Separator](https://zenithw.space/audio-separator):** a refreshed studio interface makes choosing files, working with separated vocals and instrumentals, previewing audio and exporting results clearer.
- **Eight-language coverage:** the Image Converter interface and its accessibility labels are localized across all eight website languages. Image conversion and resizing run locally in your browser.
- Existing media tools remain available, including remuxing compatible MKV/MP4 streams without re-encoding.

Windows and Android keep their own independent version numbers; this release label refers to the web version.

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
