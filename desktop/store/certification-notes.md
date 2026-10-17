# Notes for Microsoft certification

ZenithW is a free AGPL-3.0-only Windows desktop media utility. No ZenithW account, payment, administrator prompt, kernel driver or NT service is required. It supports Turkish, English, German and Russian. Source and license: https://github.com/boranseasonnew/zenithw . Third-party tools retain their upstream licenses and bundled notices.

The package requests only `runFullTrust` to run yt-dlp, FFmpeg, FFprobe, aria2 and Deno locally, access files selected by the user, and present native file dialogs, tray and notifications. Media downloads use the device's network connection. There is no server-side media-processing dependency or hidden external application installer.

On first Store execution, the packaged yt-dlp engine is copied into writable user data. Optional stable/nightly engine updates come from official yt-dlp release sources and preserve the app's described media function. The app UI itself is updated through Microsoft Store. Updates never modify the read-only MSIX installation. Source access, cookies, proxy, SponsorBlock and user-chosen local scripts are optional and explicitly configured in Settings.

For basic testing, choose a publicly accessible media URL you own or are allowed to use, inspect it, select a format, then download to a test folder. Test aria2 enabled and disabled. A given video source may impose temporary authentication or access restrictions; the application does not promise to bypass them. Also verify language selection, playlist options, subtitle/metadata controls and engine update in Settings.

Exit and restart the app: preferences, downloaded files and up to 300 local history entries remain. History can be cleared from the app. Settings → cookie controls can clear the optional app cookie session. Do not include personal cookies or account credentials in test reports. Desktop-specific privacy policy: https://github.com/boranseasonnew/zenithw/blob/main/desktop/store/privacy.md .

Final submission requires the actual Partner Center identity and a Windows App Certification Kit run on the signed/test-installed package. The locally generated DRAFT identity is a packaging check, not a Store submission or certification result.


## Version 4.2.0 update

Adds byte-based transfer progress, independent link inspection, batch input (50 URLs), a bounded 100-job queue, playlist selection and verified 3000×3000 square artwork for supported containers. The top-right menu includes About and version details. In the Store distribution the app-update action opens Microsoft Store Downloads and updates; it does not query or offer the GitHub EXE. The package identity and publisher remain the same as the approved 4.1.0 package; package version is 4.2.0.0. This package has been built and inspected locally. No new signed-package runtime or Windows App Certification Kit run was performed for this update; Microsoft certification is still required.
