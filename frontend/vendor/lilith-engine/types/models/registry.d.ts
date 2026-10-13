import type { AudioModelManifest } from '../types.js';
import type { ModelAdapter } from './adapter.js';
export declare const MDX_MODEL: AudioModelManifest;
export declare function validateManifest(model: AudioModelManifest): void;
export declare function getModel(id?: string): AudioModelManifest;
export declare function listModels(): readonly AudioModelManifest[];
export declare class ModelRegistry {
    private factories;
    register(manifest: AudioModelManifest, factory: () => ModelAdapter): void;
    create(id: string): ModelAdapter;
}
