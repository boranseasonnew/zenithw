import type { JobOptions, SeparationResult, SeparatorOptions } from '../types.js';
export declare class SeparationEngine {
    private readonly options;
    readonly model: import("../types.js").AudioModelManifest;
    private busy;
    private disposed;
    private worker?;
    private abort?;
    constructor(options?: SeparatorOptions);
    separate(file: Blob, job?: JobOptions): Promise<SeparationResult>;
    storageInfo(): Promise<{
        cachedBytes: number;
        usage?: number;
        quota?: number;
    }>;
    clearCache(): Promise<boolean>;
    dispose(): Promise<void>;
}
export declare function createSeparator(options?: SeparatorOptions): Promise<SeparationEngine>;
