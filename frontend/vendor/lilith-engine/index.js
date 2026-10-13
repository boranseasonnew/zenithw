// packages/core/src/utils/errors.ts
var AudioEngineError = class extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.code = code;
    this.name = "AudioEngineError";
  }
};
function checkAbort(signal) {
  if (signal?.aborted) throw new AudioEngineError("ABORTED", "Operation canceled.");
}

// packages/core/src/models/registry.ts
var MDX_MODEL = Object.freeze({
  id: "mdx-default",
  name: "UVR-MDX-NET-Voc_FT",
  version: "fddec39677560e41e3194f24a9e4c4cd32ef0e83",
  author: "Anjok07 and aufr33 (UVR); MDX-Net by Kuielab / Woosung Choi",
  architecture: "MDX-Net",
  description: "Stereo vocal prediction with complementary instrumental reconstruction.",
  modelUrl: "https://huggingface.co/Blane187/all_public_uvr_models/resolve/fddec39677560e41e3194f24a9e4c4cd32ef0e83/UVR-MDX-NET-Voc_FT.onnx",
  sha256: "534b2070fcc7df514b13ef660dc8cbb328679c2374d04354a5c42bb14ecce111",
  sizeBytes: 66762490,
  license: "MIT",
  sourceUrl: "https://github.com/Anjok07/ultimatevocalremovergui",
  sampleRate: 44100,
  supportedStems: Object.freeze(["vocals", "instrumental"]),
  supportedBackends: Object.freeze(["webgpu", "wasm"]),
  preprocessing: Object.freeze({ fft: 7680, hop: 1024, bins: 3072, frames: 256, compensation: 1.021 })
});
function validateManifest(model) {
  const url = new URL(model.modelUrl);
  if (url.protocol !== "https:" || url.username || url.password || !model.id || !model.author || !model.license || !/^[a-f0-9]{64}$/.test(model.sha256) || !Number.isSafeInteger(model.sizeBytes) || model.sizeBytes <= 0 || !Number.isSafeInteger(model.sampleRate) || model.sampleRate < 8e3 || model.sampleRate > 192e3 || !model.supportedBackends.length || model.supportedBackends.some((b) => !["wasm", "webgpu"].includes(b)))
    throw new AudioEngineError("MODEL", "Invalid model manifest.");
  const p = model.preprocessing;
  if (![p.fft, p.hop, p.bins, p.frames].every((n) => Number.isSafeInteger(n) && n > 0) || p.bins > p.fft / 2 + 1 || p.compensation <= 0 || !Number.isFinite(p.compensation))
    throw new AudioEngineError("MODEL", "Invalid spectral dimensions.");
}
function getModel(id = "mdx-default") {
  if (id !== MDX_MODEL.id) throw new AudioEngineError("MODEL", `Model ${id} has no implemented trusted adapter.`);
  validateManifest(MDX_MODEL);
  return MDX_MODEL;
}
function listModels() {
  return [MDX_MODEL];
}
var ModelRegistry = class {
  factories = /* @__PURE__ */ new Map();
  register(manifest, factory) {
    validateManifest(manifest);
    if (this.factories.has(manifest.id)) throw new AudioEngineError("MODEL", "Duplicate model adapter.");
    this.factories.set(manifest.id, factory);
  }
  create(id) {
    const factory = this.factories.get(id);
    if (!factory) throw new AudioEngineError("MODEL", "No trusted compiled model adapter.");
    const adapter = factory();
    validateManifest(adapter.manifest);
    if (adapter.manifest.id !== id) {
      adapter.dispose();
      throw new AudioEngineError("MODEL", "Adapter identity mismatch.");
    }
    return adapter;
  }
};

// packages/core/src/audio/decoder.ts
function validateInput(file, options) {
  if (!(file instanceof Blob) || !file.size) throw new AudioEngineError("DECODE", "Choose a nonempty audio file.");
  if (file.size > (options.maxFileBytes ?? 24 * 1024 * 1024)) throw new AudioEngineError("LIMIT", "File exceeds the configured memory-safe limit.");
}
async function durationHint(file, signal) {
  if (typeof document === "undefined") return NaN;
  return new Promise((resolve, reject) => {
    const audio = document.createElement("audio"), url = URL.createObjectURL(file);
    let timer;
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      audio.removeAttribute("src");
      audio.load();
      URL.revokeObjectURL(url);
    };
    const abort = () => {
      cleanup();
      reject(new AudioEngineError("ABORTED", "Operation canceled."));
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const d = audio.duration;
      cleanup();
      resolve(d);
    };
    audio.onerror = () => {
      cleanup();
      resolve(NaN);
    };
    timer = setTimeout(() => {
      cleanup();
      resolve(NaN);
    }, 5e3);
    signal?.addEventListener("abort", abort, { once: true });
    audio.src = url;
    if (signal?.aborted) abort();
  });
}
async function decodeAudio(file, rate, options, signal) {
  checkAbort(signal);
  validateInput(file, options);
  const max = options.maxDuration ?? 60, hint = await durationHint(file, signal);
  checkAbort(signal);
  if (Number.isFinite(hint) && hint > max) throw new AudioEngineError("LIMIT", `Audio must be ${max} seconds or shorter.`);
  const bytes = await file.arrayBuffer();
  checkAbort(signal);
  const context = new OfflineAudioContext(2, 1, rate);
  let audio;
  try {
    audio = await context.decodeAudioData(bytes);
  } catch (error) {
    throw new AudioEngineError("DECODE", "This browser cannot decode the file. Try WAV, MP3 or a supported codec.", { cause: error });
  }
  checkAbort(signal);
  if (audio.duration <= 0 || audio.duration > max || audio.length > rate * max || audio.sampleRate !== rate || audio.numberOfChannels > 2)
    throw new AudioEngineError("LIMIT", "Decoded audio exceeds duration/channel limits (mono or stereo only).");
  const left = new Float32Array(audio.getChannelData(0)), right = new Float32Array(audio.getChannelData(audio.numberOfChannels === 1 ? 0 : 1));
  for (const channel of [left, right]) for (const sample of channel) if (!Number.isFinite(sample)) throw new AudioEngineError("DECODE", "Audio contains invalid samples.");
  return { channels: [left, right], sampleRate: rate, duration: audio.length / rate };
}

// packages/core/src/export/wav.ts
function encodeWav(channels, rate = 44100) {
  if (!channels[0].length || channels[0].length !== channels[1].length || !Number.isSafeInteger(rate) || rate < 8e3 || rate > 192e3) throw new RangeError("Invalid PCM dimensions/rate.");
  const count = channels[0].length, buffer = new ArrayBuffer(44 + count * 4), view = new DataView(buffer);
  const ascii = (offset, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  ascii(0, "RIFF");
  view.setUint32(4, buffer.byteLength - 8, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, count * 4, true);
  for (let i = 0; i < count; i++) for (let ch = 0; ch < 2; ch++) {
    const value = channels[ch][i];
    if (!Number.isFinite(value)) throw new RangeError("Non-finite PCM.");
    const x = Math.max(-1, Math.min(1, value));
    view.setInt16(44 + (i * 2 + ch) * 2, Math.round(x * (x < 0 ? 32768 : 32767)), true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

// packages/core/src/export/zip.ts
function safeFilename(name = "audio") {
  return name.replace(/\.[^.]+$/, "").normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "audio";
}
var table = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = n & 1 ? 3988292384 ^ n >>> 1 : n >>> 1;
  return n >>> 0;
});
function crc32(bytes) {
  let n = 4294967295;
  for (const b of bytes) n = table[(n ^ b) & 255] ^ n >>> 8;
  return (n ^ 4294967295) >>> 0;
}
async function zipStems(vocals, instrumental, name = "audio") {
  const locals = [], central = [];
  let offset = 0, centralSize = 0;
  for (const [filename, blob] of [[safeFilename(name) + "_vocals.wav", vocals], [safeFilename(name) + "_instrumental.wav", instrumental]]) {
    const encoded = new TextEncoder().encode(filename), bytes = new Uint8Array(await blob.arrayBuffer()), crc = crc32(bytes);
    const local = new Uint8Array(30 + encoded.length), l = new DataView(local.buffer);
    l.setUint32(0, 67324752, true);
    l.setUint16(4, 20, true);
    l.setUint32(14, crc, true);
    l.setUint32(18, bytes.length, true);
    l.setUint32(22, bytes.length, true);
    l.setUint16(26, encoded.length, true);
    local.set(encoded, 30);
    const entry = new Uint8Array(46 + encoded.length), c = new DataView(entry.buffer);
    c.setUint32(0, 33639248, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, bytes.length, true);
    c.setUint32(24, bytes.length, true);
    c.setUint16(28, encoded.length, true);
    c.setUint32(42, offset, true);
    entry.set(encoded, 46);
    locals.push(local, blob);
    central.push(entry);
    offset += local.length + bytes.length;
    centralSize += entry.length;
  }
  const end = new Uint8Array(22), e = new DataView(end.buffer);
  e.setUint32(0, 101010256, true);
  e.setUint16(8, 2, true);
  e.setUint16(10, 2, true);
  e.setUint32(12, centralSize, true);
  e.setUint32(16, offset, true);
  return new Blob([...locals, ...central, end], { type: "application/zip" });
}

// packages/core/src/runtime/model-cache.ts
var MODEL_CACHE = "lilith-models-v1";
async function modelStorage() {
  let cachedBytes = 0;
  if (typeof caches !== "undefined" && await caches.has(MODEL_CACHE)) {
    const cache = await caches.open(MODEL_CACHE);
    for (const request of await cache.keys()) {
      const response = await cache.match(request);
      if (response) cachedBytes += (await response.blob()).size;
    }
  }
  const estimate = await navigator.storage?.estimate();
  return { cachedBytes, usage: estimate?.usage, quota: estimate?.quota };
}
async function clearModelCache() {
  return typeof caches !== "undefined" ? caches.delete(MODEL_CACHE) : false;
}

// packages/core/src/engine/separation-engine.ts
var SeparationEngine = class {
  constructor(options = {}) {
    this.options = options;
    this.model = getModel(options.model);
    if (options.backend && !["auto", "webgpu", "wasm"].includes(options.backend)) throw new AudioEngineError("RUNTIME", "Invalid backend.");
  }
  model;
  busy = false;
  disposed = false;
  worker;
  abort;
  async separate(file, job = {}) {
    if (this.disposed) throw new AudioEngineError("DISPOSED", "Separator was disposed.");
    if (this.busy) throw new AudioEngineError("BUSY", "A separation job is already running.");
    checkAbort(job.signal);
    if (typeof Worker === "undefined" || typeof OfflineAudioContext === "undefined" || !globalThis.isSecureContext)
      throw new AudioEngineError("UNSUPPORTED", "Use a current browser on HTTPS or localhost with Web Audio and module Worker support.");
    this.busy = true;
    const controller = new AbortController();
    this.abort = () => controller.abort();
    const externalAbort = () => controller.abort();
    job.signal?.addEventListener("abort", externalAbort, { once: true });
    const report = (event) => job.onProgress?.(event);
    try {
      report({ stage: "decoding" });
      const audio = await decodeAudio(file, this.model.sampleRate, this.options, controller.signal);
      checkAbort(controller.signal);
      const output = await new Promise((resolve, reject) => {
        const worker = new Worker(this.options.workerUrl ?? new URL("./separation-worker.js", import.meta.url), { type: "module" });
        this.worker = worker;
        const timer = setTimeout(() => fail(new AudioEngineError("WORKER", "Inference exceeded 30 minutes. Try a shorter file.")), 30 * 60 * 1e3);
        const cleanup = () => {
          clearTimeout(timer);
          controller.signal.removeEventListener("abort", abort);
          worker.terminate();
          this.worker = void 0;
        };
        const fail = (error) => {
          cleanup();
          reject(error);
        };
        const abort = () => fail(new AudioEngineError("ABORTED", "Operation canceled."));
        controller.signal.addEventListener("abort", abort, { once: true });
        worker.onerror = (event) => fail(new AudioEngineError("WORKER", event.message || "Inference worker failed."));
        worker.onmessageerror = () => fail(new AudioEngineError("WORKER", "Invalid worker message."));
        worker.onmessage = ({ data }) => {
          if (data.type === "progress") {
            try {
              report(data.event);
            } catch (error) {
              fail(error instanceof Error ? error : new Error("Progress callback failed."));
            }
          } else if (data.type === "done") {
            cleanup();
            resolve(data);
          } else if (data.type === "error") fail(new AudioEngineError(data.code, data.message));
        };
        worker.postMessage({ model: this.model.id, backend: this.options.backend ?? "auto", cache: this.options.cache !== false, channels: audio.channels }, audio.channels.map((c) => c.buffer));
      });
      checkAbort(controller.signal);
      const stem = (channels) => ({ channels, sampleRate: this.model.sampleRate, duration: channels[0].length / this.model.sampleRate });
      const vocals = stem(output.vocals), instrumental = stem(output.instrumental);
      let disposed = false;
      const ensure = () => {
        if (disposed) throw new AudioEngineError("DISPOSED", "Result PCM was released.");
      };
      const result = {
        vocals,
        instrumental,
        metadata: { model: this.model.id, backend: output.backend, inferenceSeconds: output.inferenceSeconds, gain: output.gain },
        exportWav: (name) => {
          ensure();
          if (!["vocals", "instrumental"].includes(name)) throw new AudioEngineError("OUTPUT", "Unknown stem.");
          const value = name === "vocals" ? vocals : instrumental;
          return encodeWav(value.channels, value.sampleRate);
        },
        exportZip: async (name = "audio") => {
          ensure();
          return zipStems(result.exportWav("vocals"), result.exportWav("instrumental"), name);
        },
        dispose: () => {
          disposed = true;
          vocals.channels = [new Float32Array(), new Float32Array()];
          instrumental.channels = [new Float32Array(), new Float32Array()];
        }
      };
      report({ stage: "ready", backend: output.backend });
      return result;
    } finally {
      job.signal?.removeEventListener("abort", externalAbort);
      this.worker?.terminate();
      this.worker = void 0;
      this.busy = false;
      this.abort = void 0;
    }
  }
  storageInfo() {
    return modelStorage();
  }
  clearCache() {
    if (this.busy) throw new AudioEngineError("BUSY", "Wait or cancel before clearing the model cache.");
    return clearModelCache();
  }
  async dispose() {
    this.disposed = true;
    this.abort?.();
    this.worker?.terminate();
    this.worker = void 0;
  }
};
async function createSeparator(options = {}) {
  return new SeparationEngine(options);
}

// packages/core/src/playback/synchronized-player.ts
var SynchronizedPlayer = class {
  buffers;
  gains;
  sources = [];
  revision = 0;
  offset = 0;
  startedAt = 0;
  active = false;
  mode = "both";
  disposed = false;
  volumes = { vocals: 1, instrumental: 1 };
  muted = { vocals: false, instrumental: false };
  context;
  duration;
  constructor(result, context) {
    this.context = context ?? new AudioContext();
    this.duration = result.vocals.duration;
    if (!this.duration || result.instrumental.duration !== this.duration) throw new RangeError("Aligned stems required.");
    const buffer = (name) => {
      const stem = result[name], b = this.context.createBuffer(2, stem.channels[0].length, stem.sampleRate);
      for (let ch = 0; ch < 2; ch++) b.copyToChannel(stem.channels[ch], ch);
      return b;
    };
    this.buffers = { vocals: buffer("vocals"), instrumental: buffer("instrumental") };
    this.gains = { vocals: this.context.createGain(), instrumental: this.context.createGain() };
    for (const gain of Object.values(this.gains)) gain.connect(this.context.destination);
  }
  get playing() {
    return this.active && this.currentTime < this.duration;
  }
  get playbackMode() {
    return this.mode;
  }
  get currentTime() {
    return Math.min(this.duration, Math.max(0, this.offset + (this.active ? Math.max(0, this.context.currentTime - this.startedAt) : 0)));
  }
  async play(mode = this.mode) {
    if (this.disposed) throw new Error("Player disposed.");
    if (!["both", "vocals", "instrumental"].includes(mode)) throw new RangeError("Invalid playback mode.");
    this.pause();
    const revision = this.revision;
    if (this.offset >= this.duration) this.offset = 0;
    this.mode = mode;
    await this.context.resume();
    if (this.disposed || revision !== this.revision) return;
    const when = this.context.currentTime + 0.03;
    this.startedAt = when;
    this.active = true;
    for (const name of mode === "both" ? ["vocals", "instrumental"] : [mode]) {
      const source = this.context.createBufferSource();
      source.buffer = this.buffers[name];
      source.connect(this.gains[name]);
      source.start(when, this.offset);
      this.sources.push(source);
      source.onended = () => {
        if (this.currentTime >= this.duration) {
          this.active = false;
          this.offset = this.duration;
          this.stopNodes();
        }
      };
    }
  }
  stopNodes() {
    for (const source of this.sources) {
      source.onended = null;
      try {
        source.stop();
      } catch {
      }
      source.disconnect();
    }
    this.sources = [];
  }
  pause() {
    ++this.revision;
    this.offset = this.currentTime;
    this.active = false;
    this.stopNodes();
  }
  async seek(seconds) {
    if (!Number.isFinite(seconds)) throw new RangeError("Invalid seek position.");
    const resume = this.playing;
    this.pause();
    this.offset = Math.max(0, Math.min(this.duration, seconds));
    if (resume) await this.play(this.mode);
  }
  volume(name, value) {
    if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError("Volume must be between 0 and 1.");
    this.volumes[name] = value;
    this.updateGain(name);
  }
  mute(name, value) {
    this.muted[name] = value;
    this.updateGain(name);
  }
  updateGain(name) {
    this.gains[name].gain.setTargetAtTime(this.muted[name] ? 0 : this.volumes[name], this.context.currentTime, 0.01);
  }
  async dispose() {
    if (this.disposed) return;
    this.pause();
    this.disposed = true;
    this.buffers = {};
    for (const gain of Object.values(this.gains)) gain.disconnect();
    await this.context.close();
  }
};

// packages/core/src/audio/waveform.ts
function waveformPeaks(channels, points = 800) {
  if (!Number.isSafeInteger(points) || points < 1 || points > 1e4) throw new RangeError("Invalid waveform resolution.");
  const n = channels[0].length, peaks = new Float32Array(Math.min(n, points));
  for (let p = 0; p < peaks.length; p++) {
    const start = Math.floor(p * n / peaks.length), end = Math.floor((p + 1) * n / peaks.length);
    let peak = 0;
    for (let i = start; i < end; i++) peak = Math.max(peak, Math.abs(channels[0][i]), Math.abs(channels[1][i]));
    peaks[p] = peak;
  }
  return peaks;
}
export {
  AudioEngineError,
  ModelRegistry,
  SeparationEngine,
  SynchronizedPlayer,
  clearModelCache,
  createSeparator,
  encodeWav,
  getModel,
  listModels,
  modelStorage,
  safeFilename,
  validateManifest,
  waveformPeaks,
  zipStems
};
