<p align="center">
  <img src="frontend/zenithw.png" width="96" height="96" alt="ZenithW logo">
</p>

<h1 align="center">ZenithW</h1>

<p align="center">
  Save media. Keep it simple.<br>
  <a href="https://zenithw.space">Web app</a> · <a href="https://github.com/boranseasonnew/zenithw/releases/latest">Windows</a> · <a href="https://github.com/boranseasonnew/zenithw-android/releases/latest">Android</a>
</p>

<p align="center">
  <a href="https://zenithw.space"><img src="https://img.shields.io/badge/Web-v17.2-7C3AED?style=for-the-badge" alt="ZenithW Web v17.2"></a>
  <a href="https://github.com/boranseasonnew/zenithw/releases/latest"><img src="https://img.shields.io/github/v/release/boranseasonnew/zenithw?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=Windows&amp;logo=windows11&amp;color=2563EB" alt="Windows latest release"></a>
</p>

<p align="center"><strong><a href="why_zenithw.md">✦ Why ZenithW? Read our story</a></strong></p>

[English](README.md) · [Türkçe](README.tr.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh.md) · [日本語](README.ja.md)

ZenithW is an open-source media downloader with tools for audio extraction, conversion and remuxing. No ads, subscription or mandatory account.

Paste a supported link, choose a format and download the file. Available formats depend on the source.

## Why ZenithW?

An open-source media workspace for downloading and processing media without mandatory accounts, subscriptions or ads.

## Features

- Download media from supported sources with a simple link-based workflow.
- Extract and process audio from media.
- Convert media formats and remux compatible MKV/MP4 streams without re-encoding.
- Convert and resize images locally in your browser.
- Separate vocals and instrumentals with the Audio Separator.

## Quick start

Clone the repository and enter the project directory:

```bash
git clone https://github.com/boranseasonnew/zenithw.git
cd zenithw
cp .env.example .env
```

Copy `.env.example` to `.env`, then set `SECRET_KEY` to a strong random value.

```bash
docker compose up -d --build
```

Open `http://localhost:8080` in your browser:

## What's new in web 17.2

- **Vimeo disabled on the public web app:** support was removed because some Vimeo links require cookies and compatibility is inconsistent with yt-dlp.
- **Translation fixes:** format names such as AVI and platform names such as Rumble are no longer incorrectly translated.
- **Settings shortcut fixed:** the download panel now opens the relevant Video settings instead of the Appearance tab.
- **Localized SEO metadata:** page titles and social previews now use the correct language for each site locale.
- **App promotion popup removed:** it no longer interrupts users while they are entering a link.

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
