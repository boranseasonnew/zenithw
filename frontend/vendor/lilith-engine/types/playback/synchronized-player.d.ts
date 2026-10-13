import type { SeparationResult, StemName } from '../types.js';
export type PlaybackMode = StemName | 'both';
export declare class SynchronizedPlayer {
    private buffers;
    private gains;
    private sources;
    private revision;
    private offset;
    private startedAt;
    private active;
    private mode;
    private disposed;
    private volumes;
    private muted;
    readonly context: AudioContext;
    readonly duration: number;
    constructor(result: SeparationResult, context?: AudioContext);
    get playing(): boolean;
    get playbackMode(): PlaybackMode;
    get currentTime(): number;
    play(mode?: PlaybackMode): Promise<void>;
    private stopNodes;
    pause(): void;
    seek(seconds: number): Promise<void>;
    volume(name: StemName, value: number): void;
    mute(name: StemName, value: boolean): void;
    private updateGain;
    dispose(): Promise<void>;
}
