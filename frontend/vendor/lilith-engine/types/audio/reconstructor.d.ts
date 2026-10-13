import type { Stereo } from '../types.js';
export declare function reconstruct(mix: Stereo, prediction: Stereo, compensation: number, reusePrediction?: boolean): {
    vocals: Stereo;
    instrumental: Stereo;
    gain: number;
};
