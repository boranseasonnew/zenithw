export type Backend = 'auto' | 'webgpu' | 'wasm';
export type StemName = 'vocals' | 'instrumental';
export type Stereo = [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>];
export interface DecodedAudio {
    channels: Stereo;
    sampleRate: number;
    duration: number;
}
export interface AudioModelManifest {
    id: string;
    name: string;
    version: string;
    author: string;
    architecture: string;
    description: string;
    modelUrl: string;
    sha256: string;
    sizeBytes: number;
    license: string;
    sourceUrl: string;
    sampleRate: number;
    supportedStems: readonly StemName[];
    supportedBackends: readonly Exclude<Backend, 'auto'>[];
    preprocessing: {
        fft: number;
        hop: number;
        bins: number;
        frames: number;
        compensation: number;
    };
}
export interface ProgressEvent {
    stage: string;
    progress?: number;
    loaded?: number;
    total?: number;
    completed?: number;
    cached?: boolean;
    backend?: string;
    warning?: string;
}
export interface AudioStem {
    channels: Stereo;
    sampleRate: number;
    duration: number;
}
export interface SeparationResult {
    vocals: AudioStem;
    instrumental: AudioStem;
    metadata: {
        model: string;
        backend: Exclude<Backend, 'auto'>;
        inferenceSeconds: number;
        gain: number;
    };
    exportWav(stem: StemName): Blob;
    exportZip(filename?: string): Promise<Blob>;
    dispose(): void;
}
export interface SeparatorOptions {
    model?: string;
    backend?: Backend;
    maxDuration?: number;
    range?: {
        start: number;
        duration: number;
    };
    exportWorkerUrl?: string | URL;
    maxFileBytes?: number;
    workerUrl?: string | URL;
    cache?: boolean;
}
export interface JobOptions {
    signal?: AbortSignal;
    onProgress?: (event: ProgressEvent) => void;
}
