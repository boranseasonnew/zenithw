// Scoped to the AI worker response; ordinary web pages retain their current CSP.
export const AUDIO_WORKER_CSP="default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self' https://huggingface.co https://us.aws.cdn.hf.co; worker-src 'self'; object-src 'none'; base-uri 'none'";
export const AUDIO_WORKER_PATH='/audio-separator-worker.js';

export const AUDIO_EXPORT_WORKER_PATH='/audio-export-worker.js';
export const AUDIO_EXPORT_WORKER_CSP="default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'";
