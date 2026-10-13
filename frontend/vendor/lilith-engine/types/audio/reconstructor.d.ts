import type { Stereo } from '../types.js';
export declare function reconstruct(mix: Stereo, prediction: Stereo, compensation: number): {
    vocals: Stereo;
    instrumental: Stereo;
    gain: number;
};
