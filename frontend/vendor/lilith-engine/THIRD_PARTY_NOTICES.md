# Third-party notices

Original Lilith code: MIT, Copyright 2026 Boran / Lilith Software. Neural weights are not Lilith originals and are not bundled.

## Runtime libraries

| Component | Version | License / owner | Use |
|---|---|---|---|
| onnxruntime-web | 1.30.0 | MIT, Microsoft Corporation | Actual inference, WASM and WebGPU runtime |
| web-audio-separation | 0.3.1 | MIT, Copyright 2026 Dan Kurtz | Public PffftSTFT helper only; no separator controller |
| PFFFT | embedded upstream build | BSD-style, Julien Pommier and FFTPACK authors | WASM STFT/ISTFT underlying that helper |
| esbuild | 0.25.12 | MIT, Evan Wallace | Build only |
| TypeScript | 7.0.2 | Apache-2.0, Microsoft | Build/type checks only |

The esbuild bundles preserve upstream legal comments. `docs/licenses/` contains notices available in locally installed packages.

Complete pinned ORT `LICENSE` / `ThirdPartyNotices.txt`, PFFFT `LICENSE.txt`, and the installed STFT helper's MIT license were collected after automatic approval review became available again. The build includes these full texts under SDK and Studio runtime `licenses/`. Preserve this directory when integrating or distributing assets. The initial failed review did not execute the earlier download; only the later successful reviewed action collected them.

Collected sources:

- https://github.com/microsoft/onnxruntime/blob/v1.30.0/LICENSE
- https://github.com/microsoft/onnxruntime/blob/v1.30.0/ThirdPartyNotices.txt
- https://github.com/marton78/pffft/blob/a4b03590cc2a4bea56f9721996e3057835799179/LICENSE.txt

## UVR-MDX-NET-Voc_FT model weights

Credits: Anjok07 and aufr33, Ultimate Vocal Remover core developers; original MDX-Net by Kuielab / Woosung Choi. The UVR README explicitly addresses third-party model use under MIT with developer credits. The pinned Hugging Face mirror has an MIT card. These are separately recorded from architecture code licensing. The upstream README's LICENSE link returned 404 during review; no missing license file is fabricated.

- Owner statement: https://github.com/Anjok07/ultimatevocalremovergui#license
- Mirror: https://huggingface.co/Blane187/all_public_uvr_models
- Pinned revision: `fddec39677560e41e3194f24a9e4c4cd32ef0e83`
- File: `UVR-MDX-NET-Voc_FT.onnx`, 66,762,490 bytes
- SHA-256: `534b2070fcc7df514b13ef660dc8cbb328679c2374d04354a5c42bb14ecce111`

The software downloads this public model only on an explicit separation action. No permission is inferred for other weights merely because an architecture is MIT. HyperACE, Resurrection and unverified model files are not distributed or enabled.
