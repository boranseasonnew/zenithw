export interface ChunkPlan {
    chunkSize: number;
    trim: number;
    paddedLength: number;
    starts: number[];
}
export declare function planChunks(length: number, fft?: number, hop?: number, frames?: number): ChunkPlan;
export declare function hann(size: number): Float32Array<ArrayBuffer>;
