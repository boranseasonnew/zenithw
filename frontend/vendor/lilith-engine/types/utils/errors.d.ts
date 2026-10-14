export type ErrorCode = 'ABORTED' | 'BUSY' | 'DISPOSED' | 'LIMIT' | 'SIZE' | 'DURATION' | 'CHANNELS' | 'DECODE' | 'MODEL' | 'INTEGRITY' | 'RUNTIME' | 'OUTPUT' | 'WORKER' | 'UNSUPPORTED';
export declare class AudioEngineError extends Error {
    readonly code: ErrorCode;
    constructor(code: ErrorCode, message: string, options?: ErrorOptions);
}
export declare function checkAbort(signal?: AbortSignal): void;
