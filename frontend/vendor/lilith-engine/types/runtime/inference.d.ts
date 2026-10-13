import * as ort from 'onnxruntime-web';
import type { AudioModelManifest, Backend, ProgressEvent } from '../types.js';
export declare function initializeInference(bytes: ArrayBuffer, model: AudioModelManifest, backend: Backend, report: (event: ProgressEvent) => void): Promise<{
    session: ort.InferenceSession;
    backend: "wasm" | "webgpu";
}>;
