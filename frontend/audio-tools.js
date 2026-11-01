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
  automaticCopy: "Upload once. Get vocals and music together. No settings needed.",
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
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.6");
    svg.setAttribute("aria-hidden", "true");
    const p = document.createElementNS(svg.namespaceURI, "path");
    p.setAttribute("d", { upload: "M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4", download: "M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4", vocals: "M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5Zm-3 6v1a6 6 0 0 0 12 0v-1m-6 7v4m-4 0h8", instrumental: "M9 18V6l11-3v12M9 7l11-3M9 18c0 2-5 4-5 1s5-4 5-1Zm11-3c0 2-5 4-5 1s5-4 5-1Z", shield: "m12 2 8 3v6c0 5-8 11-8 11S4 16 4 11V5l8-3Zm-4 9 3 3 5-6" }[kind]);
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
    const volumes = { vocals: 1, instrumental: 1 }, muted = { vocals: false, instrumental: false };
    const ensurePlayer = () => {
      if (!player) {
        player = new SynchronizedPlayer(value);
        for (const name of ["vocals", "instrumental"]) {
          player.volume(name, volumes[name]);
          player.mute(name, muted[name]);
        }
      }
      return player;
    };
    result = value;
    output.hidden = false;
    const heading2 = el("div", void 0, "results-heading"), both = el("button", t.both), zip = el("button", t.zip);
    heading2.append(el("h2", t.results), both, zip);
    output.append(heading2, el("p", t.playbackHint, "playback-hint"));
    const updates = [];
    const tick = () => {
      updates.forEach((fn) => fn());
      both.textContent = player?.isPlaying("vocals") && player.isPlaying("instrumental") ? t.pauseBoth : t.both;
      if (player?.playing) frame = requestAnimationFrame(tick);
    };
    const playback = async (name) => {
      try {
        if (!result || busy || destroyed) return;
        ensurePlayer();
        if (name === "both") {
          if (player.isPlaying("vocals") && player.isPlaying("instrumental")) player.pause();
          else await player.play("both");
        } else if (player.isPlaying(name)) player.pauseStem(name);
        else await player.playStem(name);
        cancelAnimationFrame(frame);
        tick();
      } catch {
        status.textContent = t.playbackError;
      }
    };
    both.onclick = () => void playback("both");
    zip.onclick = async () => {
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
    for (const name of ["vocals", "instrumental"]) {
      const row = el("article", void 0, "stem-card");
      row.dataset.stem = name;
      const rowHead = el("div", void 0, "stem-heading"), glyph = el("span", void 0, "stem-icon");
      glyph.append(icon(name));
      const title = el("div");
      title.append(el("h3", t[name]), el("small", t[name === "vocals" ? "vocalsHint" : "instrumentalHint"]));
      const clock = el("span", `0:00 / ${time(value[name].duration)}`, "track-clock");
      rowHead.append(glyph, title, clock);
      await yieldToBrowser();
      signal.throwIfAborted();
      const canvas = el("canvas");
      canvas.width = 1200;
      canvas.height = 144;
      canvas.setAttribute("aria-label", `${t[name]} ${t.waveform}`);
      const peaks = await waveformPeaksAsync(value[name].channels, 400, signal), ctx = canvas.getContext("2d"), layers = [document.createElement("canvas"), document.createElement("canvas")];
      const colors = ["#36343f", name === "vocals" ? "#c9acff" : "#87d9ce"];
      for (const [index, layer] of layers.entries()) {
        layer.width = 1200;
        layer.height = 144;
        const c = layer.getContext("2d");
        c.fillStyle = colors[index];
        for (let i = 0; i < peaks.length; i++) {
          const height = Math.max(2, Math.min(1, peaks[i]) * 132);
          c.fillRect(i * 3, 72 - height / 2, 2, height);
        }
      }
      const seek = el("input");
      seek.className = "seek";
      seek.type = "range";
      seek.min = "0";
      seek.max = String(value[name].duration);
      seek.step = ".01";
      seek.value = "0";
      seek.setAttribute("aria-label", `${t[name]} ${t.seek}`);
      const controls = el("div", void 0, "player-controls"), play = el("button", t.play, "play-button"), save = el("button", void 0, "download-button");
      save.append(icon("download"), el("span", t.downloadAudio));
      save.setAttribute("aria-label", `${t[name]} ${t.downloadAudio}`);
      save.onclick = () => {
        selectedStem = name;
        returnFocus = save;
        exportTarget.textContent = t[name];
        exportStatus.textContent = "";
        dialog.showModal();
      };
      play.onclick = () => void playback(name);
      const volume = el("input");
      volume.type = "range";
      volume.min = "0";
      volume.max = "1";
      volume.step = ".01";
      volume.value = "1";
      volume.setAttribute("aria-label", `${t[name]} ${t.volume}`);
      volume.oninput = () => {
        volumes[name] = Number(volume.value);
        player?.volume(name, volumes[name]);
      };
      const mute = el("button", t.mute, "mute-button");
      mute.setAttribute("aria-pressed", "false");
      mute.onclick = () => {
        const active = mute.getAttribute("aria-pressed") !== "true";
        muted[name] = active;
        mute.setAttribute("aria-pressed", String(active));
        player?.mute(name, active);
      };
      const volumeGroup = el("div", void 0, "volume-group");
      volumeGroup.append(mute, volume);
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
      let lastPixel = -1, lastTime = "";
      const draw = () => {
        const seconds = player?.currentTime ?? 0, fraction = seconds / value[name].duration, pixel = Math.min(1198, Math.floor(1200 * fraction));
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
          ctx.fillStyle = colors[1];
          ctx.fillRect(pixel, 0, 2, 144);
        }
        const label = `${time(seconds)} / ${time(value[name].duration)}`;
        if (label !== lastTime) {
          lastTime = label;
          clock.textContent = label;
          seek.setAttribute("aria-valuetext", label);
        }
        seek.value = String(seconds);
        play.textContent = player?.isPlaying(name) ? t.pause : t.play;
        row.dataset.playing = String(player?.isPlaying(name) ?? false);
      };
      controls.append(play, save, volumeGroup);
      row.append(rowHead, canvas, seek, controls);
      output.append(row);
      updates.push(draw);
    }
    output.append(el("p", t.resultsInfo.replace("{duration}", number(value.vocals.duration, 2)).replace("{backend}", value.metadata.backend.toUpperCase()).replace("{time}", number(value.metadata.totalSeconds ?? value.metadata.inferenceSeconds)), "model-info"));
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
mountStudio(root, strings, { workerUrl: "/audio-separator-worker.js?v=fb3ef8db479a", exportWorkerUrl: "/audio-export-worker.js?v=8e89dd115571" });
