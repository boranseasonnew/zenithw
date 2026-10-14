# Automatic audio workflow — 2026-10-14

The Studio selects the pinned UVR-MDX-NET-Voc_FT model and automatic WebGPU/WASM backend. Selecting an ordinary mono/stereo file starts one separation job for both stems. No action, model or backend form is shown. This is the previously tested licensed model, not a claim of universal best quality.

File size, channel and duration failures are separate. The four-minute/96 MiB ceilings remain. A longer file exposes its measured duration and explicit start/end range. Only the selected range is decoded using Mediabunny AudioSampleSink, trimmed on PCM sample boundaries, resampled with Web Audio and sent into the same SDK separation pipeline. No silent truncation. Compressed range decoding depends on native WebCodecs support; browsers without that codec get an actionable message. Ordinary files retain Web Audio decoding.

Each stem transport can join or leave the shared AudioContext timeline. Both sources are scheduled at identical times and offsets; individual gains implement transport/mute independently. Seeking moves the shared clock. Static real-PCM waveform layers are clipped at the actual playback position; requestAnimationFrame runs only while playing.

The native dialog offers MP3 256 kbps, FLAC 24-bit and WAV PCM16. MP3/FLAC use unmodified official Mediabunny 1.61.4 extensions in a lazily requested dedicated export worker, with embedded LAME/libFLAC WASM and small sample blocks. Closing the dialog cancels its worker. The separation result is retained for concurrent playback and subsequent exports. WAV and ZIP remain SDK exports. All encoder dependencies retain their MPL/LGPL/BSD terms; exact package source, notices and rebuild instructions are distributed under licenses/source-code. No encoder calls a service or uploads audio.

Verified on desktop Chromium: real 8s musical fixture automatic neural separation (WebGPU 16.8s); both stem controls active at the same 0:01 clock; pausing vocals left instrumental active; real downloaded MP3 257618B decoded stereo duration 8.045708s (MP3 encoder padding), FLAC 1429086B decoded stereo 8s, WAV 1411244B decoded stereo 8s. WAV is 44.1kHz; Web Audio playback decode resampled to the hardware 48kHz context. A synthetic mono 8kHz 241s file offered a range, and its explicit 238–240s segment completed real AI inference (7.1s) with 2s results. Synthetic tones validate clipping/resampling, not vocal quality. Actual screenshot MP3 was not supplied, so its duration/codec is unmeasured.

Mobile 390px Chromium layout: no horizontal overflow. ESC closed the native dialog and restored focus to the download button. Physical Android, Firefox and Safari are unverified; Android resource use and four-minute CPU performance remain limitations. Previously measured four-minute WebGPU separation remains the duration ceiling reference, not a phone benchmark.

Host integration also verified real 8s WebGPU separation (15.0s) and all three actual downloads under the same Pages middleware/export-worker CSP. No application page gains WASM eval permission.

All eight 390px locale routes passed: translated headings and controls, no manual selectors and no horizontal overflow; reduced-motion transitions are 0s. SDK types/build/lint and 29 unit checks passed. Web integration/cache/language/media regression: 23 checks passed.

Integrated independent Lilith main commit cb1ad9e73df0c4b3bda094b2f5908e73c165d061. Final repeatable browser-case passed: automatic 8s WebGPU11.5s, concurrent playback and independent pause, seek, mute, ESC/focus, actual MP3/FLAC/WAV/ZIP downloads, no non-GET requests and no page errors. Isolated frozen pnpm10.11.1 install, complete production build/lint/cache verification passed.
