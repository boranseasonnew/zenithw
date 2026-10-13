import * as ort from 'onnxruntime-web';
import type { ModelAdapter } from './adapter.js';
import type { ProgressEvent, Stereo } from '../types.js';
export declare class MdxAdapter implements ModelAdapter {
    readonly manifest: import("../types.js").AudioModelManifest;
    private fft?;
    validate(channels: Stereo): void;
    infer(session: ort.InferenceSession, mix: Stereo, report: (event: ProgressEvent) => void): Promise<Stereo>;
    dispose(): void;
}
