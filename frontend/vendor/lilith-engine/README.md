# Lilith Audio Engine

An independent TypeScript SDK for private, browser-based AI audio separation. Original orchestration, model management, chunking, reconstruction, playback and exports by **Lilith Software**. The pretrained neural network is by the UVR developers, not trained by Lilith.

## Development status

**0.1 development preview, not a production release.** One trusted MDX-Net adapter is implemented. No paid API, GPU server, audio uploads, telemetry or undisclosed server fallback. No deployed Studio or published npm package is claimed. See `PERFORMANCE.md` for measured runs and unverified environments; `MODEL_SUPPORT.md` for model license evidence and limitations.

## Requirements and development

Use Node 24 LTS and npm. Versions are locked. Installation scripts are unnecessary; the build locates esbuild's installed platform binary.

```sh
npm ci --ignore-scripts
npm run typecheck
npm run lint
npm run build:core # SDK without building Studio
npm run build
npm test
npm run dev
```

Open `http://127.0.0.1:3340`. Studio production output: `dist/studio`. The SDK builds independently to `packages/core/dist` (ESM, declarations, module worker and runtime files). Copy its entire directory; preserving the relative runtime layout is required. Cloudflare Pages' 25 MiB asset limit is handled with two runtime parts. Model weights are downloaded on demand, not committed. Do not deploy without owner approval.

## SDK quick start

`@lilith/audio-engine` is an intended package name, not a claimed published or reserved name. Use a local workspace/package path until publishing is separately authorized.

```ts
import { createSeparator, SynchronizedPlayer } from '@lilith/audio-engine';
const separator = await createSeparator({model:'mdx-default',backend:'auto'});
const controller = new AbortController();
const result = await separator.separate(file, {
  signal:controller.signal,
  onProgress:event => console.log(event.stage, event.progress),
});
const vocalWav = result.exportWav('vocals');
const zip = await result.exportZip(file.name);
const player = new SynchronizedPlayer(result);
await player.play('both'); // call inside a user gesture
await player.seek(2);
player.volume('vocals',0.7);
player.mute('instrumental',true);
player.pause();
await player.dispose();
result.dispose();
await separator.dispose();
```

No model is downloaded by `createSeparator`. Browser codec support determines accepted input; mono and stereo are supported. Defaults: 96 MiB compressed input, 240 seconds (four minutes) decoded audio. Studio offers an explicit section of up to four minutes for longer files; the SDK supports `range:{start,duration}`. Native codec support is needed for compressed range decoding. Longer whole-file jobs require explicit configuration and are not validated. Four-minute processing is not a mobile-memory safety guarantee. WAV export is genuine stereo PCM16. ZIP contains two separate sanitized WAV filenames. Audio is not persisted. The model-only cache is integrity-checked and removable through `storageInfo` / `clearCache`.

## Architecture

- `packages/core/src/engine`: controller, cancellation, worker lifecycle and public API.
- `audio`: decoding/resampling, bounded chunk plan, complementary-stem reconstruction, real PCM peak extraction.
- `models`: pinned typed manifest and trusted compiled MDX adapter.
- `runtime`: verified lazy model download, model cache, ORT backend selection.
- `workers`: real neural inference away from the UI thread.
- `playback`: shared AudioContext timeline; stems start at the exact same timestamp/offset, independent gains.
- `export`: PCM16 WAV, WAV ZIP with CRC32, and lazy MP3/FLAC worker encoding with independent cancellation.
- `apps/studio`: lightweight TypeScript UI consuming only the public SDK.

UVR-MDX-NET-Voc_FT predicts vocals; instrumental = original mixture − compensated vocal estimate. Both outputs receive one common peak gain if needed to prevent clipping. Stereo, length and alignment are preserved. Spectral preprocessing uses Dan Kurtz's MIT PFFFT helper, not an imported separation controller. No EQ filtering is presented as separation.

## Compatibility and limitations

Secure contexts, module workers, WebAssembly SIMD and Web Audio are required. WebGPU is feature-detected; Auto can use WASM fallback. A user's requested WebGPU-only job fails clearly rather than silently reporting CPU as GPU. Single-thread WASM avoids imposing COOP/COEP on host websites. First operation downloads ~66.8 MB model plus ~26.8 MB runtime. Runtime is browser HTTP cached; model caching is optional and quota failures are reported.

Whole-file browser decoding still allocates PCM before inference. Metadata validation helps reject long compressed files, but a malicious header cannot guarantee absence of decoder memory spikes. Web Audio decoding itself cannot be forcibly interrupted; cancellation rejects its result after completion. Worker download/inference cancellation is immediate via termination. MP3 256 kbps and FLAC 24-bit exports use the official Mediabunny encoders in a lazily loaded worker. M4A export is not implemented. Safari, real Android hardware, perceptual quality and mobile memory ceiling remain unverified. No claim of UVR Online parity or realtime performance.

## Tests

Normal CI runs types, lint, unit tests and builds without model downloads. Heavyweight real inference uses an explicitly supplied authorized local recording; see `docs/EVALUATION.md`. Infrastructure mocks in playback unit tests do not prove neural separation. Browser inference must be reported separately with genuine model output.

## Roadmap

Complete browser/device and listening evaluation, publish an approved integration, then investigate explicitly licensed RoFormer conversions. Planned candidates are not runnable models. See `docs/ADAPTERS.md`, `docs/PRIVACY.md`, `CONTRIBUTING.md`, and `SECURITY.md`.

## Licensing

Original source MIT; third-party libraries and weights keep their own terms. Full third-party notice packaging is a release gate; see `THIRD_PARTY_NOTICES.md`. Lilith Software is a brand designation, not a claim of incorporation.

## Automatic Studio and additional exports

Selecting a file starts one AI job for both stems. No manual action or model selector. `player.playStem(name)` joins the shared playback clock; `pauseStem(name)` leaves the other stem playing. `exportAudio(result.vocals, 'mp3', {signal,onProgress})` and `exportAudio(result.instrumental, 'flac')` retain the original PCM. Keep all generated lazy modules and the `audio-export-worker.js` file when hosting the SDK. The export worker requires its own WASM compilation permission and blob child-worker permission; ordinary HTML does not. Exact third-party codec source and license packaging is included. See [automatic workflow and validation](docs/AUTOMATIC_AUDIO_WORKFLOW.md).
