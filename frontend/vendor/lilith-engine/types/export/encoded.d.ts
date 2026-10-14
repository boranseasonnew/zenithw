import type { AudioStem } from '../types.js';
export type AudioExportFormat = 'wav' | 'mp3' | 'flac';
export declare function exportAudio(stem: AudioStem, format: AudioExportFormat, options?: {
    signal?: AbortSignal;
    onProgress?: (fraction: number) => void;
    workerUrl?: string | URL;
}): Promise<Blob>;
