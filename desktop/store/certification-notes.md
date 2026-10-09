# Notes for Microsoft certification

ZenithW is a free AGPL-3.0-only Windows desktop media utility. No ZenithW account, payment, administrator prompt, kernel driver or NT service is required. It supports Turkish, English, German and Russian. Source and license: https://github.com/boranseasonnew/zenithw . Third-party tools retain their upstream licenses and bundled notices.

The package requests only `runFullTrust` to run yt-dlp, FFmpeg, FFprobe, aria2 and Deno locally, access files selected by the user, and present native file dialogs, tray and notifications. Media downloads use the device's network connection. There is no server-side media-processing dependency or hidden external application installer.

On first Store execution, the packaged yt-dlp engine is copied into writable user data. Optional stable/nightly engine updates come from official yt-dlp release sources and preserve the app's described media function. The app UI itself is updated through Microsoft Store. Updates never modify the read-only MSIX installation. Source access, cookies, proxy, SponsorBlock and user-chosen local scripts are optional and explicitly configured in Settings.

For basic testing, choose a publicly accessible media URL you own or are allowed to use, inspect it, select a format, then download to a test folder. Test aria2 enabled and disabled. A given video source may impose temporary authentication or access restrictions; the application does not promise to bypass them. Also verify language selection, playlist options, subtitle/metadata controls and engine update in Settings.

Exit and restart the app: session history resets while preferences and downloaded files remain. Settings → cookie controls can clear the optional app cookie session. Do not include personal cookies or account credentials in test reports. Desktop-specific privacy policy: https://github.com/boranseasonnew/zenithw/blob/main/desktop/store/privacy.md .

Final submission requires the actual Partner Center identity and a Windows App Certification Kit run on the signed/test-installed package. The locally generated DRAFT identity is a packaging check, not a Store submission or certification result.
