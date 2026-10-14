import type { DecodedAudio } from '../types.js';
export declare function inspect(file: Blob): Promise<{
    duration: number;
    channels: number;
}>;
export declare function decodeRange(file: Blob, start: number, duration: number, rate: number, signal?: AbortSignal): Promise<DecodedAudio>;
