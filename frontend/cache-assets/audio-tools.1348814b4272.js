// shared/lilith-studio.ts
import { createSeparator, SynchronizedPlayer, safeFilename, inspectAudio, exportAudio } from "/vendor/lilith-engine/index.js?v=658fbf14c76d";

// shared/audio-preview.mjs
var yieldToBrowser = () => globalThis.scheduler?.yield ? globalThis.scheduler.yield() : new Promise((resolve) => setTimeout(resolve, 0));
function peakBetween(left, right, start, end) {
  let peak = 0;
  for (let i = start; i < end; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  return peak;
}
async function waveformPeaksAsync(channels, points = 400, signal) {
  if (!Number.isSafeInteger(points) || points < 1 || points > 1e4) throw new RangeError("Invalid waveform resolution");
  const n = channels[0].length;
  const peaks = new Float32Array(Math.min(n, points));
  let deadline = performance.now() + 8;
  signal?.throwIfAborted();
  for (let p = 0; p < peaks.length; p++) {
    const start = Math.floor(p * n / peaks.length), end = Math.floor((p + 1) * n / peaks.length);
    let peak = 0;
    for (let i = start; i < end; i += 32768) {
      peak = Math.max(peak, peakBetween(channels[0], channels[1], i, Math.min(end, i + 32768)));
      signal?.throwIfAborted();
      if (performance.now() >= deadline) {
        await yieldToBrowser();
        deadline = performance.now() + 8;
      }
    }
    peaks[p] = peak;
  }
  signal?.throwIfAborted();
  return peaks;
}

// shared/audio-repeat.mjs
function createRepeatController() {
  let enabled = false, wasPlaying = false, lastMode = null;
  return {
    toggle() {
      enabled = !enabled;
      return enabled;
    },
    cancel() {
      wasPlaying = false;
      lastMode = null;
    },
    observe({ playing, vocals, instrumental, currentTime, duration }) {
      if (playing) {
        const mode2 = vocals && instrumental ? "both" : vocals ? "vocals" : instrumental ? "instrumental" : null;
        if (mode2) {
          wasPlaying = true;
          lastMode = mode2;
        }
        return null;
      }
      const mode = enabled && wasPlaying && duration > 0 && currentTime >= duration ? lastMode : null;
      wasPlaying = false;
      return mode;
    }
  };
}

// shared/audio-export.mjs
function writeFrames(view, channels, start, end) {
  for (let i = start; i < end; i++) for (let channel = 0; channel < 2; channel++) {
    const sample = channels[channel][i];
    if (!Number.isFinite(sample)) throw new RangeError("Non-finite PCM");
    const value = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 4 + channel * 2, Math.round(value * (value < 0 ? 32768 : 32767)), true);
  }
}
async function encodeWavAsync(channels, rate = 44100, signal, onProgress) {
  const count = channels[0]?.length;
  if (!count || channels[1]?.length !== count || !Number.isSafeInteger(rate) || rate < 8e3 || rate > 192e3 || count * 4 > 4294967295 - 36) throw new RangeError("Invalid PCM dimensions/rate");
  signal?.throwIfAborted();
  const buffer = new ArrayBuffer(44 + count * 4), view = new DataView(buffer);
  for (const [offset, text] of [[0, "RIFF"], [8, "WAVE"], [12, "fmt "], [36, "data"]]) for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  for (const [offset, value] of [[4, buffer.byteLength - 8], [16, 16], [24, rate], [28, rate * 4], [40, count * 4]]) view.setUint32(offset, value, true);
  for (const [offset, value] of [[20, 1], [22, 2], [32, 4], [34, 16]]) view.setUint16(offset, value, true);
  let deadline = performance.now() + 8;
  for (let start = 0; start < count; start += 16384) {
    writeFrames(view, channels, start, Math.min(count, start + 16384));
    signal?.throwIfAborted();
    if (performance.now() >= deadline) {
      onProgress?.(Math.min(1, (start + 16384) / count));
      await yieldToBrowser();
      deadline = performance.now() + 8;
    }
  }
  signal?.throwIfAborted();
  onProgress?.(1);
  return new Blob([buffer], { type: "audio/wav" });
}
var crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let i = 0; i < 8; i++) value = value & 1 ? 3988292384 ^ value >>> 1 : value >>> 1;
  return value >>> 0;
});
function updateCrc(crc, bytes, start, end) {
  for (let i = start; i < end; i++) crc = crcTable[(crc ^ bytes[i]) & 255] ^ crc >>> 8;
  return crc;
}
async function blobCrc(blob, signal) {
  let crc = 4294967295, deadline = performance.now() + 8;
  const reader = blob.stream().getReader();
  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      for (let offset = 0; offset < value.length; offset += 32768) {
        crc = updateCrc(crc, value, offset, Math.min(value.length, offset + 32768));
        signal?.throwIfAborted();
        if (performance.now() >= deadline) {
          await yieldToBrowser();
          deadline = performance.now() + 8;
        }
      }
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  return (crc ^ 4294967295) >>> 0;
}
async function zipWavStems(result, name = "audio", signal, onProgress) {
  const base = String(name).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "audio";
  const localParts = [], directory = [];
  let offset = 0, directorySize = 0;
  for (const [index, stemName] of ["vocals", "instrumental"].entries()) {
    signal?.throwIfAborted();
    const stem = result[stemName];
    const wav = await encodeWavAsync(stem.channels, stem.sampleRate, signal, (value) => onProgress?.((index + value * 0.7) / 2));
    const crc = await blobCrc(wav, signal), filename = new TextEncoder().encode(base + "_" + stemName + ".wav");
    const local = new Uint8Array(30 + filename.length), header = new DataView(local.buffer);
    header.setUint32(0, 67324752, true);
    header.setUint16(4, 20, true);
    header.setUint16(6, 2048, true);
    header.setUint16(12, 33, true);
    for (const [position, value] of [[14, crc], [18, wav.size], [22, wav.size]]) header.setUint32(position, value, true);
    header.setUint16(26, filename.length, true);
    local.set(filename, 30);
    const central = new Uint8Array(46 + filename.length), entry = new DataView(central.buffer);
    entry.setUint32(0, 33639248, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 2048, true);
    entry.setUint16(14, 33, true);
    for (const [position, value] of [[16, crc], [20, wav.size], [24, wav.size], [42, offset]]) entry.setUint32(position, value, true);
    entry.setUint16(28, filename.length, true);
    central.set(filename, 46);
    localParts.push(local, wav);
    directory.push(central);
    offset += local.length + wav.size;
    directorySize += central.length;
    onProgress?.((index + 1) / 2);
  }
  signal?.throwIfAborted();
  const end = new Uint8Array(22), view = new DataView(end.buffer);
  view.setUint32(0, 101010256, true);
  view.setUint16(8, 2, true);
  view.setUint16(10, 2, true);
  view.setUint32(12, directorySize, true);
  view.setUint32(16, offset, true);
  return new Blob([...localParts, ...directory, end], { type: "application/zip" });
}

// shared/lilith-studio.ts
var ENGLISH = {
  upload: "Choose your audio",
  browse: "Browse files",
  drop: "Drop a file here, or browse from your device.",
  formats: "Mono or stereo \xB7 Up to 4 minutes / 96 MiB \xB7 Codecs depend on your browser",
  modelInfo: "UVR-MDX-NET-Voc_FT \xB7 66.8 MB \xB7 First run downloads the model and a 26.8 MB runtime. Quality varies by recording.",
  cancel: "Cancel",
  ready: "Ready when you are.",
  privacy: "Your audio is never uploaded. Only public model files are downloaded. No tracking, ads or hidden server processing.",
  results: "Your separated stems",
  vocals: "Vocals",
  instrumental: "Instrumental",
  play: "Play",
  pause: "Pause",
  both: "Play Both",
  pauseBoth: "Pause Both",
  repeat: "Repeat playback",
  seek: "Seek",
  volume: "Volume",
  mute: "Mute",
  zip: "Download Both \xB7 ZIP",
  cache: "Remove cached model",
  storage: "Model storage",
  canceled: "Canceled. Audio and inference resources released.",
  failed: "Unable to process this file.",
  working: "Processing",
  download: "Downloading model",
  cached: "Using verified cached model",
  decoding: "Decoding audio",
  runtime: "Loading inference runtime",
  loading: "Initializing model",
  verify: "Verifying model integrity",
  tensors: "Preparing tensors",
  inference: "Running AI inference",
  reconstructing: "Reconstructing audio",
  complete: "Ready for playback",
  fallback: "WebGPU failed; trying WASM / CPU",
  cleared: "Cached model removed.",
  cacheError: "Cannot clear cache while processing.",
  credits: "Model: Anjok07 and aufr33 / UVR. MDX-Net: Kuielab. Not a Lilith-trained neural network.",
  waveform: "Waveform",
  decodeError: "This browser could not decode the file. Try WAV or MP3.",
  modelError: "Model download or verification failed. Check your connection and try again.",
  runtimeError: "Local inference failed. Try a shorter file and retry.",
  browserError: "Local AI processing is unavailable in this browser. Use a current browser on a secure connection.",
  locale: "en-US",
  resultsInfo: "{duration} s \xB7 44.1 kHz \xB7 {backend} \xB7 Processing: {time} s",
  playbackError: "Playback failed. Try playing the track again.",
  exportError: "The download could not be prepared. Try again.",
  cacheFailed: "The model cache could not be cleared. Try again.",
  replaceFile: "Change track",
  vocalsHint: "Isolate the voice",
  instrumentalHint: "Keep the music",
  warm: "Model ready \u2014 processing this track",
  cacheWarning: "Your browser could not keep the model cache. A later visit may download it again.",
  automatic: "Automatic separation",
  automaticCopy: "Choose a file to separate vocals and music automatically. No settings needed.",
  local: "On your device",
  retry: "Try again",
  checking: "Checking your audio",
  sizeError: "This file exceeds 96 MiB. Choose a smaller file.",
  channelError: "Only mono or stereo audio is supported. Convert this file to stereo first.",
  longFile: "This track is {duration}. Select a section of up to four minutes to keep memory use manageable.",
  rangeStart: "Start time (seconds)",
  rangeEnd: "End time (seconds)",
  rangeAction: "Separate this section",
  rangeError: "Choose a valid section between 1 second and 4 minutes within the track.",
  durationError: "This track exceeds four minutes. Select a section or choose a shorter file.",
  rangeBrowser: "Your browser cannot decode a selected section. Try a current Chromium browser or trim the file locally first.",
  exportTitle: "Download your audio",
  exportCopy: "Choose a format. Encoding happens on your device.",
  downloadAudio: "Download",
  close: "Close",
  mp3Hint: "Smaller file \xB7 256 kbps",
  flacHint: "Lossless compression \xB7 24-bit",
  wavHint: "Uncompressed \xB7 16-bit PCM",
  encoding: "Preparing download",
  exportCanceled: "Download canceled.",
  playbackHint: "Play either track or blend both. Both stay in sync.",
  firstRun: "The first run downloads the AI model. CPU processing can take much longer; keep this tab open."
};
function mountStudio(root2, overrides = {}, options = {}) {
  const t = { ...ENGLISH, ...overrides };
  let engine, result, player, file;
  let controller, exportController, busy = false, exporting = false, frame = 0, generation = 0, destroyed = false, duration = 0;
  let lastProgressPaint = 0;
  const urls = /* @__PURE__ */ new Set(), timers = /* @__PURE__ */ new Set();
  const el = (tag, text, cls) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (cls) node.className = cls;
    return node;
  };
  const number = (v, digits = 1) => new Intl.NumberFormat(t.locale, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(v);
  const time = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const icon = (kind) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    const isSolid = ["play", "pause", "rewind", "forward"].includes(kind);
    svg.setAttribute("fill", isSolid ? "currentColor" : "none");
    svg.setAttribute("stroke", isSolid ? "none" : "currentColor");
    if (!isSolid) svg.setAttribute("stroke-width", "1.6");
    svg.setAttribute("aria-hidden", "true");
    const p = document.createElementNS(svg.namespaceURI, "path");
    p.setAttribute("d", { upload: "M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4", download: "M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4", vocals: "M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5Zm-3 6v1a6 6 0 0 0 12 0v-1m-6 7v4m-4 0h8", instrumental: "M9 18V6l11-3v12M9 7l11-3M9 18c0 2-5 4-5 1s5-4 5-1Zm11-3c0 2-5 4-5 1s5-4 5-1Z", shield: "m12 2 8 3v6c0 5-8 11-8 11S4 16 4 11V5l8-3Zm-4 9 3 3 5-6", play: "M8 5v14l11-7z", pause: "M6 19h4V5H6v14zm8-14v14h4V5h-4z", rewind: "M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z", forward: "M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z", repeat: "m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h18M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3" }[kind]);
    svg.append(p);
    return svg;
  };
  root2.dataset.state = "upload";
  const workspace = el("section", void 0, "audio-workspace"), top = el("div", void 0, "workspace-top"), heading = el("div");
  heading.append(el("span", t.local, "local-badge"), el("h2", t.automatic), el("p", t.automaticCopy));
  top.append(heading);
  const input = el("input");
  input.type = "file";
  input.accept = "audio/*,.wav,.mp3,.flac,.ogg,.m4a,.aac,.webm";
  input.id = "lilith-file";
  input.className = "file-input";
  const browse = el("button", t.browse, "primary");
  browse.onclick = () => input.click();
  const drop = el("div", void 0, "drop-area"), uploadGlyph = el("span", void 0, "upload-icon"), filename = el("p", t.drop, "filename");
  uploadGlyph.append(icon("upload"));
  drop.append(uploadGlyph, el("h3", t.upload), filename, input, browse, el("small", t.formats));
  const track = el("div", void 0, "track-strip");
  track.hidden = true;
  const trackIcon = el("span", void 0, "track-icon");
  trackIcon.append(icon("instrumental"));
  const trackCopy = el("div"), trackName = el("strong"), trackMeta = el("small"), replace = el("button", t.replaceFile);
  replace.onclick = () => input.click();
  trackCopy.append(trackName, trackMeta);
  track.append(trackIcon, trackCopy, replace);
  const statusPanel = el("div", void 0, "processing-panel");
  statusPanel.hidden = true;
  const status = el("p", t.ready, "status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const progress = el("progress");
  progress.max = 1;
  progress.hidden = true;
  progress.setAttribute("aria-label", t.working);
  const cancel = el("button", t.cancel), retry = el("button", t.retry, "primary");
  cancel.hidden = true;
  retry.hidden = true;
  const processActions = el("div", void 0, "process-actions");
  processActions.append(cancel, retry);
  statusPanel.append(status, progress, processActions);
  const rangePanel = el("section", void 0, "range-panel");
  rangePanel.hidden = true;
  const rangeCopy = el("p"), rangeFields = el("div", void 0, "range-fields"), startLabel = el("label", t.rangeStart), endLabel = el("label", t.rangeEnd), rangeStart = el("input"), rangeEnd = el("input"), rangeAction = el("button", t.rangeAction, "primary");
  for (const r of [rangeStart, rangeEnd]) {
    r.type = "number";
    r.step = "1";
    r.min = "0";
  }
  startLabel.append(rangeStart);
  endLabel.append(rangeEnd);
  rangeFields.append(startLabel, endLabel, rangeAction);
  rangePanel.append(rangeCopy, rangeFields);
  const output = el("section", void 0, "results");
  output.hidden = true;
  output.setAttribute("aria-label", t.results);
  const privacy = el("div", void 0, "privacy-note");
  privacy.append(icon("shield"), el("p", t.privacy));
  const firstRun = el("p", t.firstRun, "device-note");
  workspace.append(top, drop, track, rangePanel, statusPanel, output, firstRun, privacy);
  const cacheBar = el("div", void 0, "cache-bar"), storage = el("span", t.storage), clear = el("button", t.cache);
  cacheBar.append(storage, clear);
  const dialog = el("dialog", void 0, "export-dialog");
  dialog.setAttribute("closedby", "any");
  dialog.setAttribute("aria-labelledby", "lilith-export-title");
  const modalHead = el("div", void 0, "modal-heading"), modalTitle = el("h2", t.exportTitle);
  modalTitle.id = "lilith-export-title";
  const close = el("button", "\xD7", "dialog-close");
  close.setAttribute("aria-label", t.close);
  close.onclick = () => dialog.close();
  modalHead.append(modalTitle, close);
  const modalSub = el("p", t.exportCopy), exportTarget = el("strong", void 0, "export-target"), formatGrid = el("div", void 0, "format-grid"), exportStatus = el("p", void 0, "export-status");
  exportStatus.setAttribute("role", "status");
  let selectedStem = "vocals", returnFocus;
  const formatButtons = [];
  for (const format of ["mp3", "flac", "wav"]) {
    const button = el("button", void 0, "format-choice");
    button.dataset.format = format;
    button.append(el("strong", format.toUpperCase()), el("small", t[`${format}Hint`]));
    button.onclick = () => void encode(format);
    formatButtons.push(button);
    formatGrid.append(button);
  }
  dialog.append(modalHead, exportTarget, modalSub, formatGrid, exportStatus);
  if (!("closedBy" in HTMLDialogElement.prototype)) dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
  dialog.addEventListener("close", () => {
    exportController?.abort();
    returnFocus?.focus();
  });
  root2.replaceChildren(workspace, cacheBar, el("p", t.credits, "credits"), dialog);
  const updateStorage = async () => {
    try {
      const sdk = engine ?? await createSeparator();
      const info = await sdk.storageInfo();
      storage.textContent = `${t.storage}: ${number(info.cachedBytes / 1e6)} MB`;
    } catch {
      storage.textContent = t.storage;
    }
  };
  void updateStorage();
  const setBusy = (value) => {
    busy = value;
    root2.setAttribute("aria-busy", String(value));
    root2.dataset.state = value ? "processing" : result ? "results" : file ? "selected" : "upload";
    cancel.hidden = !value;
    retry.hidden = value;
    clear.disabled = value;
    replace.disabled = value;
    input.disabled = value;
    browse.disabled = value;
    rangeAction.disabled = value;
    progress.hidden = !value;
  };
  const clearResults = async () => {
    cancelAnimationFrame(frame);
    await player?.dispose();
    player = void 0;
    result?.dispose();
    result = void 0;
    output.replaceChildren();
    output.hidden = true;
  };
  const download = (blob, name) => {
    const url = URL.createObjectURL(blob);
    urls.add(url);
    const link = el("a");
    link.href = url;
    link.download = name;
    root2.append(link);
    link.click();
    link.remove();
    const timer = setTimeout(() => {
      URL.revokeObjectURL(url);
      urls.delete(url);
      timers.delete(timer);
    }, 6e4);
    timers.add(timer);
  };
  const encode = async (format) => {
    if (!result || exporting) return;
    exporting = true;
    exportController = new AbortController();
    formatButtons.forEach((b) => b.disabled = true);
    exportStatus.textContent = t.encoding;
    try {
      const stem = result[selectedStem], onProgress = (f) => {
        if (!destroyed) exportStatus.textContent = `${t.encoding} \xB7 ${number(f * 100, 0)}%`;
      };
      const blob = format === "wav" ? await encodeWavAsync(stem.channels, stem.sampleRate, exportController.signal, onProgress) : await exportAudio(stem, format, { signal: exportController.signal, workerUrl: options.exportWorkerUrl, onProgress });
      if (!destroyed && dialog.open) {
        download(blob, `${safeFilename(file?.name)}_${selectedStem}.${format}`);
        dialog.close();
      }
    } catch (error) {
      if (!destroyed) exportStatus.textContent = exportController.signal.aborted ? t.exportCanceled : t.exportError;
    } finally {
      exporting = false;
      formatButtons.forEach((b) => b.disabled = false);
    }
  };
  let lastProgressStage = "";
  const report = (event) => {
    if (destroyed) return;
    const now = performance.now();
    if (event.stage === lastProgressStage && !event.warning && event.progress !== 1 && now - lastProgressPaint < 100) return;
    lastProgressPaint = now;
    lastProgressStage = event.stage;
    if (event.warning && /unavailable|quota/.test(event.warning)) {
      firstRun.textContent = t.cacheWarning;
    }
    const names = { decoding: t.decoding, "model-download": event.cached ? t.cached : t.download, "model-verify": t.verify, "model-ready": t.warm, runtime: t.runtime, "model-load": t.loading, "preparing-tensors": t.tensors, inference: t.inference, reconstructing: t.reconstructing, ready: t.complete, "cpu-fallback": t.fallback };
    status.textContent = (names[event.stage] ?? t.working) + (event.completed !== void 0 ? ` \xB7 ${event.completed}/${event.total}` : event.loaded !== void 0 && !event.cached ? ` \xB7 ${number(event.loaded / 1e6)} / ${number((event.total ?? 0) / 1e6)} MB` : "");
    if (event.progress !== void 0) progress.value = event.progress;
    else progress.removeAttribute("value");
  };
  const messages = { ABORTED: t.canceled, LIMIT: t.durationError, SIZE: t.sizeError, DURATION: t.durationError, CHANNELS: t.channelError, DECODE: t.decodeError, MODEL: t.modelError, INTEGRITY: t.modelError, RUNTIME: t.runtimeError, WORKER: t.runtimeError, UNSUPPORTED: t.browserError };
  async function process(range) {
    if (!file || busy || exporting) return;
    setBusy(true);
    statusPanel.hidden = false;
    rangePanel.hidden = true;
    controller = new AbortController();
    const token = ++generation;
    try {
      await clearResults();
      if (!engine) engine = await createSeparator({ ...options, model: "mdx-default", backend: "auto", maxDuration: 240, maxFileBytes: 96 * 1024 * 1024 });
      const value = await engine.separate(file, { signal: controller.signal, onProgress: report, range });
      if (token !== generation || destroyed) {
        value.dispose();
        return;
      }
      await showResults(value, controller.signal);
      status.textContent = t.complete;
      retry.hidden = true;
      void updateStorage();
    } catch (error) {
      if (!destroyed) {
        if (controller.signal.aborted) {
          await clearResults();
          status.textContent = t.canceled;
        } else {
          const code = error instanceof Error && "code" in error ? String(error.code) : "";
          status.textContent = range && code === "UNSUPPORTED" ? t.rangeBrowser : messages[code] ?? t.failed;
          if (code === "DURATION" && duration > 240) showRange();
        }
      }
    } finally {
      if (!destroyed) {
        setBusy(false);
        retry.hidden = !!result || !Boolean(rangePanel.hidden);
      }
    }
  }
  function showRange() {
    rangePanel.hidden = false;
    rangeCopy.textContent = t.longFile.replace("{duration}", time(duration));
    rangeStart.value = "0";
    rangeEnd.value = String(Math.min(240, Math.floor(duration)));
    rangeStart.max = String(Math.floor(duration) - 1);
    rangeEnd.max = String(Math.floor(duration));
  }
  async function updateFile(next) {
    if (!next || busy || exporting || destroyed) return;
    const token = ++generation;
    file = next;
    statusPanel.hidden = false;
    status.textContent = t.checking;
    rangePanel.hidden = true;
    retry.hidden = true;
    drop.hidden = true;
    track.hidden = false;
    trackName.textContent = next.name;
    trackMeta.textContent = `${number(next.size / 1024 / 1024)} MiB`;
    await clearResults();
    if (next.size > 96 * 1024 * 1024) {
      status.textContent = t.sizeError;
      return;
    }
    setBusy(true);
    cancel.hidden = true;
    try {
      const info = await inspectAudio(next);
      if (destroyed || token !== generation) return;
      duration = info.duration;
      trackMeta.textContent = `${time(duration)} \xB7 ${number(next.size / 1024 / 1024)} MiB`;
      if ((info.channels ?? 2) > 2) {
        status.textContent = t.channelError;
        return;
      }
      if (duration > 240) {
        status.textContent = t.durationError;
        showRange();
        return;
      }
    } catch {
      duration = 0;
    } finally {
      if (!destroyed) setBusy(false);
    }
    if (!destroyed && token === generation) await process();
  }
  input.addEventListener("change", () => void updateFile(input.files?.[0]));
  drop.addEventListener("dragover", (e) => {
    e.preventDefault();
    drop.classList.add("dragging");
  });
  drop.addEventListener("dragleave", () => drop.classList.remove("dragging"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("dragging");
    void updateFile(e.dataTransfer?.files[0]);
  });
  rangeAction.onclick = () => {
    const start = Number(rangeStart.value), end = Number(rangeEnd.value);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > duration || end - start < 1 || end - start > 240) {
      status.textContent = t.rangeError;
      return;
    }
    void process({ start, duration: end - start });
  };
  retry.onclick = () => void updateFile(file);
  cancel.onclick = () => {
    if (exporting) exportController?.abort();
    else controller?.abort();
  };
  async function showResults(value, signal) {
    const volumes = { vocals: 1, instrumental: 1 };
    const userMuted = { vocals: false, instrumental: false };
    const soloState = { vocals: false, instrumental: false };
    let previewContext;
    const ensurePlayer = () => {
      if (!player) {
        previewContext ??= new AudioContext();
        player = new SynchronizedPlayer(value, previewContext);
        for (const name of ["vocals", "instrumental"]) {
          player.volume(name, volumes[name]);
        }
        applyMuteSolo();
      }
      return player;
    };
    const applyMuteSolo = () => {
      if (!player) return;
      const hasSolo = soloState.vocals || soloState.instrumental;
      for (const s of ["vocals", "instrumental"]) {
        if (hasSolo) {
          player.mute(s, !soloState[s] || userMuted[s]);
        } else {
          player.mute(s, userMuted[s]);
        }
      }
    };
    result = value;
    output.hidden = false;
    const heading2 = el("div", void 0, "results-heading");
    const titleGroup = el("div", void 0, "results-title-group");
    const trackReady = el("h2", file?.name ? `"${file.name}"` : t.results);
    const metaTag = el("span", t.resultsInfo.replace("{duration}", number(value.vocals.duration, 2)).replace("{backend}", value.metadata.backend.toUpperCase()).replace("{time}", number(value.metadata.totalSeconds ?? value.metadata.inferenceSeconds)), "results-meta-pill");
    titleGroup.append(trackReady, metaTag);
    const replaceBtn = el("button", t.replaceFile, "btn-replace");
    replaceBtn.onclick = () => input.click();
    heading2.append(titleGroup, replaceBtn);
    output.append(heading2);
    const updates = [];
    const repeat = createRepeatController();
    let repeatRestarting = false;
    const tick = () => {
      updates.forEach((fn) => fn());
      const isBoth = Boolean(player?.isPlaying("vocals") && player?.isPlaying("instrumental"));
      both.textContent = isBoth ? t.pauseBoth : t.both;
      masterPlayBtn.setAttribute("aria-label", isBoth ? t.pauseBoth : t.both);
      const repeatMode = repeat.observe({
        playing: Boolean(player?.playing),
        vocals: Boolean(player?.isPlaying("vocals")),
        instrumental: Boolean(player?.isPlaying("instrumental")),
        currentTime: player?.currentTime ?? 0,
        duration: value.vocals.duration
      });
      if (repeatMode && player && !repeatRestarting && !busy && !destroyed && result === value) {
        repeatRestarting = true;
        void player.play(repeatMode).then(() => {
          repeatRestarting = false;
          if (!destroyed && result === value) {
            cancelAnimationFrame(frame);
            tick();
          }
        }).catch((error) => {
          repeatRestarting = false;
          console.error("[ZenithW audio preview] Repeat failed:", error);
          if (!destroyed && result === value) status.textContent = t.playbackError;
        });
        return;
      }
      if (player?.playing) {
        masterPlayBtn.replaceChildren(icon("pause"));
        masterPlayBtn.classList.add("is-playing");
        frame = requestAnimationFrame(tick);
      } else {
        masterPlayBtn.replaceChildren(icon("play"));
        masterPlayBtn.classList.remove("is-playing");
      }
    };
    const playback = async (name) => {
      try {
        if (!result || busy || destroyed) return;
        previewContext ??= new AudioContext();
        await previewContext.resume();
        ensurePlayer();
        if (name === "both") {
          if (player.isPlaying("vocals") && player.isPlaying("instrumental")) {
            player.pause();
            repeat.cancel();
          } else await player.play("both");
        } else if (player.isPlaying(name)) {
          player.pauseStem(name);
          if (!player.playing) repeat.cancel();
        } else await player.playStem(name);
        cancelAnimationFrame(frame);
        tick();
      } catch (error) {
        console.error("[ZenithW audio preview] Playback failed:", error);
        status.textContent = t.playbackError;
      }
    };
    const handleZip = async () => {
      if (busy || exporting || destroyed) return;
      exporting = true;
      setBusy(true);
      zip.disabled = true;
      exportController = new AbortController();
      status.textContent = t.encoding;
      try {
        const blob = await zipWavStems(value, safeFilename(file?.name), exportController.signal, (fraction) => {
          if (!destroyed) {
            progress.value = fraction;
            status.textContent = `${t.encoding} \xB7 ${number(fraction * 100, 0)}%`;
          }
        });
        if (!destroyed) {
          download(blob, safeFilename(file?.name) + "_stems.zip");
          status.textContent = t.complete;
        }
      } catch {
        if (!destroyed) status.textContent = exportController.signal.aborted ? t.exportCanceled : t.exportError;
      } finally {
        exporting = false;
        if (!destroyed) {
          setBusy(false);
          zip.disabled = false;
        }
      }
    };
    const stemsContainer = el("div", void 0, "stems-container");
    const updateSoloButtons = [];
    for (const name of ["instrumental", "vocals"]) {
      const row = el("article", void 0, "stem-card");
      row.dataset.stem = name;
      const stemPlay = el("button", void 0, "stem-play-btn");
      stemPlay.type = "button";
      stemPlay.setAttribute("aria-label", `${t.play} ${t[name]}`);
      stemPlay.setAttribute("aria-pressed", "false");
      stemPlay.append(icon("play"));
      stemPlay.onclick = () => void playback(name);
      updates.push(() => {
        const active = Boolean(player?.isPlaying(name));
        if (stemPlay.dataset.playing !== String(active)) {
          stemPlay.dataset.playing = String(active);
          stemPlay.setAttribute("aria-pressed", String(active));
          stemPlay.setAttribute("aria-label", `${active ? t.pause : t.play} ${t[name]}`);
          stemPlay.replaceChildren(icon(active ? "pause" : "play"));
        }
      });
      const mixerStrip = el("div", void 0, "stem-mixer-strip");
      const dialWrap = el("div", void 0, "stem-vol-dial");
      dialWrap.setAttribute("title", `${t[name]} ${t.volume}`);
      const gaugeSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      gaugeSvg.setAttribute("viewBox", "0 0 44 44");
      gaugeSvg.setAttribute("class", "vol-gauge-svg");
      const arcBg = document.createElementNS(gaugeSvg.namespaceURI, "circle");
      arcBg.setAttribute("cx", "22");
      arcBg.setAttribute("cy", "22");
      arcBg.setAttribute("r", "16");
      arcBg.setAttribute("class", "vol-arc-bg");
      const arcProg = document.createElementNS(gaugeSvg.namespaceURI, "circle");
      arcProg.setAttribute("cx", "22");
      arcProg.setAttribute("cy", "22");
      arcProg.setAttribute("r", "16");
      arcProg.setAttribute("class", "vol-arc-prog");
      gaugeSvg.append(arcBg, arcProg);
      const volNum = el("span", "100", "vol-value-text");
      const volumeInput = el("input", void 0, "vol-hidden-range");
      volumeInput.type = "range";
      volumeInput.min = "0";
      volumeInput.max = "1";
      volumeInput.step = ".01";
      volumeInput.value = "1";
      volumeInput.setAttribute("aria-label", `${t[name]} ${t.volume}`);
      const updateVolGauge = (v) => {
        const circumference = 100.53;
        const arcSpan = circumference * 0.75;
        arcProg.style.strokeDashoffset = String(arcSpan * (1 - v));
        volNum.textContent = String(Math.round(v * 100));
      };
      updateVolGauge(1);
      volumeInput.oninput = () => {
        const v = Number(volumeInput.value);
        volumes[name] = v;
        player?.volume(name, v);
        updateVolGauge(v);
      };
      dialWrap.append(gaugeSvg, volNum, volumeInput);
      const msGroup = el("div", void 0, "stem-ms-group");
      const muteBtn = el("button", "M", "btn-ms btn-mute");
      muteBtn.setAttribute("title", `${t.mute} (${t[name]})`);
      muteBtn.setAttribute("aria-pressed", "false");
      muteBtn.onclick = () => {
        userMuted[name] = !userMuted[name];
        muteBtn.setAttribute("aria-pressed", String(userMuted[name]));
        applyMuteSolo();
      };
      const soloBtn = el("button", "S", "btn-ms btn-solo");
      soloBtn.setAttribute("title", `Solo (${t[name]})`);
      soloBtn.setAttribute("aria-pressed", "false");
      soloBtn.onclick = () => {
        soloState[name] = !soloState[name];
        soloBtn.setAttribute("aria-pressed", String(soloState[name]));
        applyMuteSolo();
        updateSoloButtons.forEach((fn) => fn());
      };
      updateSoloButtons.push(() => {
        soloBtn.setAttribute("aria-pressed", String(soloState[name]));
      });
      msGroup.append(muteBtn, soloBtn);
      mixerStrip.append(dialWrap, msGroup);
      const centerArea = el("div", void 0, "stem-center-area");
      const metaRow = el("div", void 0, "stem-meta-row");
      const badge = el("span", t[name], "stem-badge");
      badge.prepend(icon(name));
      const clock = el("span", `0:00 / ${time(value[name].duration)}`, "stem-time-badge");
      metaRow.append(badge, clock);
      await yieldToBrowser();
      signal.throwIfAborted();
      const waveformWrap = el("div", void 0, "waveform-wrap");
      const canvas = el("canvas");
      canvas.width = 1200;
      canvas.height = 144;
      canvas.setAttribute("aria-label", `${t[name]} ${t.waveform}`);
      const peaks = await waveformPeaksAsync(value[name].channels, 400, signal);
      const ctx = canvas.getContext("2d"), layers = [document.createElement("canvas"), document.createElement("canvas")];
      const isVoc = name === "vocals";
      const colors = ["#171922", isVoc ? "#a855f7" : "#22c55e"];
      for (const [index, layer] of layers.entries()) {
        layer.width = 1200;
        layer.height = 144;
        const c = layer.getContext("2d");
        c.fillStyle = colors[index];
        const barW = 2.2, count = peaks.length, step = 1200 / count;
        for (let i = 0; i < count; i++) {
          const h = Math.max(3, Math.min(1, peaks[i]) * 132);
          const x = i * step, y = 72 - h / 2;
          if (typeof c.roundRect === "function") {
            c.beginPath();
            c.roundRect(x, y, barW, h, 1.2);
            c.fill();
          } else {
            c.fillRect(x, y, barW, h);
          }
        }
      }
      const seek = el("input", void 0, "seek");
      seek.type = "range";
      seek.min = "0";
      seek.max = String(value[name].duration);
      seek.step = ".01";
      seek.value = "0";
      seek.setAttribute("aria-label", `${t[name]} ${t.seek}`);
      const seekFromPointer = (e) => {
        if (!result || busy || destroyed) return;
        const rect = canvas.getBoundingClientRect();
        const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const targetSec = frac * value[name].duration;
        ensurePlayer().seek(targetSec).then(() => {
          cancelAnimationFrame(frame);
          tick();
        }).catch(() => {
          status.textContent = t.playbackError;
        });
      };
      canvas.addEventListener("pointerdown", (e) => {
        canvas.setPointerCapture(e.pointerId);
        seekFromPointer(e);
        const onMove = (ev) => seekFromPointer(ev);
        const onUp = (ev) => {
          canvas.removeEventListener("pointermove", onMove);
          canvas.removeEventListener("pointerup", onUp);
          try {
            canvas.releasePointerCapture(ev.pointerId);
          } catch {
          }
        };
        canvas.addEventListener("pointermove", onMove);
        canvas.addEventListener("pointerup", onUp);
      });
      seek.oninput = () => {
        if (!result || busy || destroyed) return;
        try {
          void ensurePlayer().seek(Number(seek.value)).then(() => {
            cancelAnimationFrame(frame);
            tick();
          }).catch(() => {
            status.textContent = t.playbackError;
          });
        } catch {
          status.textContent = t.playbackError;
        }
      };
      waveformWrap.append(canvas, seek);
      centerArea.append(metaRow, waveformWrap);
      const actionsArea = el("div", void 0, "stem-actions");
      const save = el("button", void 0, "stem-download-btn");
      save.append(icon("download"));
      save.setAttribute("title", `${t[name]} ${t.downloadAudio}`);
      save.setAttribute("aria-label", `${t[name]} ${t.downloadAudio}`);
      save.onclick = () => {
        selectedStem = name;
        returnFocus = save;
        exportTarget.textContent = t[name];
        exportStatus.textContent = "";
        dialog.showModal();
      };
      actionsArea.append(save);
      row.append(stemPlay, mixerStrip, centerArea, actionsArea);
      stemsContainer.append(row);
      let lastPixel = -1, lastTime = "";
      const draw = () => {
        const seconds = player?.currentTime ?? 0;
        const fraction = seconds / value[name].duration;
        const pixel = Math.min(1198, Math.floor(1200 * fraction));
        if (pixel !== lastPixel) {
          lastPixel = pixel;
          ctx.clearRect(0, 0, 1200, 144);
          ctx.drawImage(layers[0], 0, 0);
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, 1200 * fraction, 144);
          ctx.clip();
          ctx.drawImage(layers[1], 0, 0);
          ctx.restore();
          ctx.save();
          ctx.shadowColor = "#ffffff";
          ctx.shadowBlur = 6;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(pixel, 0, 2, 144);
          ctx.restore();
        }
        const label = `${time(seconds)} / ${time(value[name].duration)}`;
        if (label !== lastTime) {
          lastTime = label;
          clock.textContent = label;
          seek.setAttribute("aria-valuetext", label);
          masterClock.textContent = label;
        }
        seek.value = String(seconds);
        row.dataset.playing = String(player?.isPlaying(name) ?? false);
      };
      updates.push(draw);
    }
    output.append(stemsContainer);
    const transportBar = el("div", void 0, "master-transport-bar");
    const transportLeft = el("div", void 0, "transport-left");
    const masterPlayBtn = el("button", void 0, "master-play-btn");
    masterPlayBtn.setAttribute("aria-label", t.both);
    masterPlayBtn.append(icon("play"));
    masterPlayBtn.onclick = () => void playback("both");
    const seekBackBtn = el("button", void 0, "transport-sub-btn");
    seekBackBtn.setAttribute("title", "-5s");
    seekBackBtn.setAttribute("aria-label", "Rewind 5s");
    seekBackBtn.append(icon("rewind"));
    seekBackBtn.onclick = () => {
      if (!result || !player) return;
      const target = Math.max(0, player.currentTime - 5);
      player.seek(target).then(() => {
        cancelAnimationFrame(frame);
        tick();
      }).catch(() => {
      });
    };
    const seekFwdBtn = el("button", void 0, "transport-sub-btn");
    seekFwdBtn.setAttribute("title", "+5s");
    seekFwdBtn.setAttribute("aria-label", "Forward 5s");
    seekFwdBtn.append(icon("forward"));
    seekFwdBtn.onclick = () => {
      if (!result || !player) return;
      const target = Math.min(value.vocals.duration, player.currentTime + 5);
      player.seek(target).then(() => {
        cancelAnimationFrame(frame);
        tick();
      }).catch(() => {
      });
    };
    const repeatBtn = el("button", void 0, "transport-sub-btn repeat-btn");
    repeatBtn.type = "button";
    repeatBtn.setAttribute("aria-label", t.repeat);
    repeatBtn.setAttribute("title", t.repeat);
    repeatBtn.setAttribute("aria-pressed", "false");
    repeatBtn.append(icon("repeat"));
    repeatBtn.onclick = () => {
      repeatBtn.setAttribute("aria-pressed", String(repeat.toggle()));
    };
    transportLeft.append(masterPlayBtn, seekBackBtn, seekFwdBtn, repeatBtn);
    const transportCenter = el("div", void 0, "transport-center");
    const masterClock = el("span", `0:00 / ${time(value.vocals.duration)}`, "master-digital-clock");
    transportCenter.append(masterClock);
    const transportRight = el("div", void 0, "transport-right");
    const both = el("button", t.both, "btn-both");
    both.onclick = () => void playback("both");
    const zip = el("button", void 0, "master-download-btn primary");
    zip.append(icon("download"), el("span", t.zip));
    zip.onclick = () => handleZip();
    transportRight.append(both, zip);
    transportBar.append(transportLeft, transportCenter, transportRight);
    output.append(transportBar);
    tick();
  }
  clear.onclick = async () => {
    try {
      await (engine ?? await createSeparator()).clearCache();
      statusPanel.hidden = false;
      status.textContent = t.cleared;
      await updateStorage();
    } catch {
      status.textContent = busy ? t.cacheError : t.cacheFailed;
    }
  };
  const destroy = async () => {
    destroyed = true;
    ++generation;
    controller?.abort();
    exportController?.abort();
    if (dialog.open) dialog.close();
    await engine?.dispose();
    await clearResults();
    for (const url of urls) URL.revokeObjectURL(url);
    for (const timer of timers) clearTimeout(timer);
    urls.clear();
    timers.clear();
  };
  window.addEventListener("pagehide", () => void destroy(), { once: true });
  return { destroy };
}

// <stdin>
var api = window.ZWLanguage;
if (api) await api.ready;
var root = document.getElementById("studio");
var strings = Object.fromEntries(Object.entries(ENGLISH).map(([key, text]) => [key, api?.translate(text) ?? text]));
var repeatLabels = {
  tr: "D\xF6ng\xFCde oynat",
  en: "Repeat playback",
  de: "Wiedergabe wiederholen",
  fr: "R\xE9p\xE9ter la lecture",
  ru: "\u041F\u043E\u0432\u0442\u043E\u0440\u044F\u0442\u044C \u0432\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0434\u0435\u043D\u0438\u0435",
  vi: "Ph\xE1t l\u1EB7p l\u1EA1i",
  zh: "\u5FAA\u73AF\u64AD\u653E",
  ja: "\u30EA\u30D4\u30FC\u30C8\u518D\u751F"
};
var audioLocale = document.documentElement.dataset.staticLanguage || document.documentElement.lang?.slice(0, 2) || "en";
strings.repeat = repeatLabels[audioLocale] ?? ENGLISH.repeat;
mountStudio(root, strings, { workerUrl: "/audio-separator-worker.js?v=fb3ef8db479a", exportWorkerUrl: "/audio-export-worker.js?v=8e89dd115571" });
