import type { InferenceSession } from 'onnxruntime-web';
import type { AudioModelManifest, ProgressEvent, Stereo } from '../types.js';
export interface ModelAdapter {
    readonly manifest: AudioModelManifest;
    validate(channels: Stereo): void;
    infer(session: InferenceSession, channels: Stereo, report: (event: ProgressEvent) => void): Promise<Stereo>;
    dispose(): void;
}
