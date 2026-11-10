# Notes for Microsoft certification

ZenithW is a free AGPL-3.0-only Windows desktop media utility. No ZenithW account, payment, administrator prompt, kernel driver or NT service is required. It supports Turkish, English, German and Russian. Source and license: https://github.com/boranseasonnew/zenithw . Third-party tools retain their upstream licenses and bundled notices.

The package requests `runFullTrust` to run yt-dlp, FFmpeg, FFprobe, aria2 and Deno locally, access files selected by the user, and present native file dialogs, tray and notifications. Media downloads use the device's network connection. Media processing runs entirely on the device.

On first Store execution, the packaged yt-dlp engine is copied into writable user data. Optional stable/nightly engine updates come from official yt-dlp release sources and preserve the app's described media function. The app UI itself is updated through Microsoft Store. Updates never modify the read-only MSIX installation. Source access, cookies, proxy, SponsorBlock and user-chosen local scripts are optional and explicitly configured in Settings.

For basic testing, choose a publicly accessible media URL you own or are allowed to use, inspect it, select a format, then download to a test folder. Test aria2 enabled and disabled. A given video source may impose temporary authentication or access restrictions; the application does not promise to bypass them. Also verify language selection, playlist options, subtitle/metadata controls and engine update in Settings.

Exit and restart the app: preferences, downloaded files and up to 300 local history entries remain. History can be cleared from the app. Settings → cookie controls can clear the optional app cookie session. Do not include personal cookies or account credentials in test reports. Desktop-specific privacy policy: https://github.com/boranseasonnew/zenithw/blob/main/desktop/store/privacy.md .

Build the submission package with the product identity from Partner Center. Use the Windows App Certification Kit to check a test installation where available. Microsoft runs its own certification on the submitted package.


## Version 5.0.0 update

Version 5.0.0 runs the desktop application on a Rust host with Microsoft Edge WebView2. The link field, download controls, and interface transitions have been updated. Test the link inspection, format selection, download queue, and history after upgrading from the current Store version. In the Store edition, the application-update action opens Microsoft Store Downloads and updates. The APPX uses the existing Store product identity and package version 5.0.0.0.
