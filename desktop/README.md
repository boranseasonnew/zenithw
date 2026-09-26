# ZenithW Desktop

This Electron project was recovered from the locally installed ZenithW 0.3.1
`resources/app.asar` package. Version 0.3.2 fixes video inspection when yt-dlp
returns metadata larger than 64 KiB. The installed app is not used as the build
output directory.

Run `npm ci`, `npm test`, and `npm run dist` from this directory. The packaging
script copies yt-dlp, FFmpeg, FFprobe, and aria2c from the installed application's
`resources/bin` folder into the ignored `resources/bin` staging directory. Set
`ZENITHW_TOOL_SOURCE` to another trusted directory containing these four tools
if the original installation is unavailable.

The Windows installer is written to `dist/ZenithW-Setup.exe`. The existing NSIS
application ID and upgrade GUID are retained. Installer binaries and embedded
media tools are intentionally excluded from Git.
