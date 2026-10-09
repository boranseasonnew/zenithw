# Usage and limitations

[Back to the project](../README.md)

## Downloading

Paste a supported link, review its available formats, choose the output and start the job. The web app needs no account or extension. Download the prepared file before its temporary link expires.

Options include video, audio extraction, muted video, resolution, container, codec, audio bitrate, subtitles, metadata, thumbnails, filename templates and SponsorBlock where supported. Playlists and small batches can be processed. You can follow progress or cancel an active job.

The Minimal, Standard and Quality profiles express preferences. Standard typically targets 1080p, H.264, MP4 and 192 kbps audio; Quality prefers higher-quality streams where available. Profiles cannot create formats absent from the source.

## Convert and remux

Convert processes an uploaded local file with FFmpeg. Remux copies compatible streams into another container without re-encoding, avoiding unnecessary quality loss. Incompatible streams require conversion instead.

Both tools are subject to processing, size and temporary-file limits. They are not permanent cloud storage.

## On-device processing (beta)

- **Server:** process the file on the backend.
- **Prefer this device:** try local processing first; ask before uploading to the server if it fails.
- **Only this device:** never upload the file; fail locally if the operation is unsupported.

The beta supports compatible stream copying and selected audio extraction. Limits are 64 MiB on desktop, 24 MiB on mobile or low-memory devices, and 30 minutes of media. Subtitles, chapters and attachments are not preserved. Link-based web downloads still use the backend.

See [local media processing](LOCAL_MEDIA.md) for implementation details.

## Source availability

YouTube downloads are disabled on the public ZenithW web service. Hosted or datacenter connections can be restricted by the source; cookies and tokens do not guarantee access. Desktop, Android and self-hosted installations use their own network environment and remain subject to source restrictions.

Other source support is also best-effort. Deleted or private media, authentication, age or regional restrictions, rate limits and upstream changes can prevent downloads. Available formats and options depend on the source.

## History and temporary files

Web download history is stored in the browser and may disappear when browser data is cleared. Prepared server files and their transfer links expire; they are not a long-term backup. Windows session history clears when the app restarts, while preferences and downloaded files remain.

Use ZenithW only for content you own or have permission to download and use.
