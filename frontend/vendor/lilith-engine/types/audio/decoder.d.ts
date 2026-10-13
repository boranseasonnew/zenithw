import type { DecodedAudio, SeparatorOptions } from '../types.js';
export declare function validateInput(file: Blob, options: SeparatorOptions): void;
export declare function decodeAudio(file: Blob, rate: number, options: SeparatorOptions, signal?: AbortSignal): Promise<DecodedAudio>;
