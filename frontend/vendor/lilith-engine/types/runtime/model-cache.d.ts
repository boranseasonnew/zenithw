import type { AudioModelManifest, ProgressEvent } from '../types.js';
export declare const MODEL_CACHE = "lilith-models-v1";
export declare function verifyModel(bytes: ArrayBuffer, model: AudioModelManifest): Promise<void>;
export declare function loadModel(model: AudioModelManifest, useCache: boolean, report: (event: ProgressEvent) => void): Promise<ArrayBuffer>;
export declare function modelStorage(): Promise<{
    cachedBytes: number;
    usage?: number;
    quota?: number;
}>;
export declare function clearModelCache(): Promise<boolean>;
