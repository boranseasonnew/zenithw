// shared/lilith-studio.ts
import { createSeparator, SynchronizedPlayer, waveformPeaks, safeFilename, listModels } from "/vendor/lilith-engine/index.js?v=d43ffcd1fda5";
var ENGLISH = {
  upload: "Choose your audio",
  browse: "Browse files",
  drop: "Drop a file here, or browse from your device.",
  formats: "Mono or stereo \xB7 Up to 60 seconds / 24 MiB \xB7 Codecs depend on your browser",
  model: "AI model",
  modelInfo: "UVR-MDX-NET-Voc_FT \xB7 66.8 MB \xB7 First run downloads the model and a 26.8 MB runtime. Quality varies by recording.",
  backend: "Processing backend",
  auto: "Auto (WebGPU \u2192 WASM)",
  wasm: "WASM / CPU",
  gpu: "WebGPU only",
  action: "Separation action",
  removeVocals: "Remove Vocals",
  removeInstrumental: "Remove Instrumental",
  extractVocals: "Extract / Download Vocals",
  extractInstrumental: "Extract / Download Instrumental",
  separate: "Separate audio",
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
  wav: "Download WAV",
  zip: "Download Both \xB7 ZIP",
  cache: "Remove cached model",
  storage: "Model storage",
  empty: "Choose an audio file first.",
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
  error: "Error",
  cleared: "Cached model removed.",
  cacheError: "Cannot clear cache while processing.",
  credits: "Model: Anjok07 and aufr33 / UVR. MDX-Net: Kuielab. Not a Lilith-trained neural network.",
  waveform: "Waveform",
  limitError: "Choose a shorter or smaller file; mono/stereo up to 60 seconds and 24 MiB.",
  decodeError: "This browser could not decode the file. Try WAV or MP3.",
  modelError: "Model download or verification failed. Check your connection and try again.",
  runtimeError: "Local inference failed. Try a shorter file in WASM / CPU mode.",
  browserError: "Local AI processing is unavailable in this browser. Use a current browser on a secure connection."
};
function mountStudio(root2, overrides = {}, options = {}) {
  const t = { ...ENGLISH, ...overrides };
  let engine, result, player;
  let file, processedFile, processedBackend = "", controller, busy = false, generation = 0, frame = 0, destroyed = false;
  const urls = /* @__PURE__ */ new Set(), timers = /* @__PURE__ */ new Set();
  const el = (tag, text, cls) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (cls) node.className = cls;
    return node;
  };
  const card = el("section", void 0, "audio-card"), label = el("h2", t.upload), drop = el("div", void 0, "drop-area");
  const input = el("input");
  input.type = "file";
  input.accept = "audio/*,.wav,.mp3,.flac,.ogg,.m4a,.aac,.webm";
  input.id = "lilith-file";
  input.className = "file-input";
  const browse = el("label", t.browse, "button");
  browse.htmlFor = input.id;
  const filename = el("p", t.drop, "filename");
  drop.append(el("span", "\u2191", "upload-icon"), filename, input, browse, el("small", t.formats));
  const fields = el("div", void 0, "fields"), modelLabel = el("label", t.model), select = el("select");
  select.setAttribute("aria-label", t.model);
  for (const model of listModels()) {
    const option = el("option", model.name);
    option.value = model.id;
    select.append(option);
  }
  modelLabel.append(select);
  const backendLabel = el("label", t.backend), backend = el("select");
  backend.setAttribute("aria-label", t.backend);
  for (const [value, text] of [["auto", t.auto], ["wasm", t.wasm], ["webgpu", t.gpu]]) {
    const option = el("option", text);
    option.value = value;
    backend.append(option);
  }
  backendLabel.append(backend);
  fields.append(modelLabel, backendLabel);
  const choices = el("fieldset"), legend = el("legend", t.action);
  choices.append(legend);
  for (const [value, text] of [["instrumental", t.removeVocals], ["vocals", t.removeInstrumental], ["vocals", t.extractVocals], ["instrumental", t.extractInstrumental]]) {
    const option = el("label", void 0, "choice"), radio = el("input");
    radio.type = "radio";
    radio.name = "lilith-action";
    radio.value = value;
    radio.checked = choices.children.length === 1;
    option.append(radio, document.createTextNode(text));
    choices.append(option);
  }
  const actions = el("div", void 0, "actions"), start = el("button", t.separate, "primary"), cancel = el("button", t.cancel);
  cancel.disabled = true;
  actions.append(start, cancel);
  const status = el("p", t.ready, "status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const progress = el("progress");
  progress.hidden = true;
  progress.max = 1;
  progress.setAttribute("aria-label", t.working);
  card.append(label, drop, fields, el("p", t.modelInfo, "model-info"), choices, actions, status, progress, el("p", t.privacy, "privacy"));
  const output = el("section", void 0, "results");
  output.hidden = true;
  output.setAttribute("aria-label", t.results);
  const cacheBar = el("div", void 0, "cache-bar"), storage = el("span", t.storage), clear = el("button", t.cache);
  cacheBar.append(storage, clear);
  root2.replaceChildren(card, output, cacheBar, el("p", t.credits, "credits"));
  const updateStorage = async () => {
    try {
      const sdk = engine ?? await createSeparator();
      const info = await sdk.storageInfo();
      storage.textContent = `${t.storage}: ${(info.cachedBytes / 1e6).toFixed(1)} MB`;
    } catch {
      storage.textContent = t.storage;
    }
  };
  void updateStorage();
  const updateFile = (next) => {
    if (busy || !next) return;
    file = next;
    filename.textContent = `${next.name} \xB7 ${(next.size / 1024 / 1024).toFixed(1)} MiB`;
    status.textContent = t.ready;
    if (result) {
      output.hidden = true;
      void clearResults();
    }
  };
  input.addEventListener("change", () => updateFile(input.files?.[0]));
  drop.addEventListener("dragover", (event) => {
    event.preventDefault();
    drop.classList.add("dragging");
  });
  drop.addEventListener("dragleave", () => drop.classList.remove("dragging"));
  drop.addEventListener("drop", (event) => {
    event.preventDefault();
    drop.classList.remove("dragging");
    updateFile(event.dataTransfer?.files[0]);
  });
  const setBusy = (value) => {
    busy = value;
    start.disabled = value;
    cancel.disabled = !value;
    clear.disabled = value;
    input.disabled = value;
    select.disabled = value;
    backend.disabled = value;
    progress.hidden = !value;
    root2.setAttribute("aria-busy", String(value));
  };
  const time = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
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
  const clearResults = async () => {
    cancelAnimationFrame(frame);
    await player?.dispose();
    player = void 0;
    result?.dispose();
    result = void 0;
    processedFile = void 0;
    output.replaceChildren();
    output.hidden = true;
  };
  const report = (event) => {
    const names = { "decoding": t.decoding, "model-download": event.cached ? t.cached : t.download, "model-verify": t.verify, "runtime": t.runtime, "model-load": t.loading, "preparing-tensors": t.tensors, "inference": t.inference, "reconstructing": t.reconstructing, "ready": t.complete, "cpu-fallback": t.fallback };
    status.textContent = (names[event.stage] ?? t.working) + (event.completed !== void 0 ? ` \xB7 ${event.completed}/${event.total}` : event.loaded !== void 0 && !event.cached ? ` \xB7 ${(event.loaded / 1e6).toFixed(1)} / ${((event.total ?? 0) / 1e6).toFixed(1)} MB` : "");
    if (event.progress !== void 0) {
      progress.value = event.progress;
    } else progress.removeAttribute("value");
  };
  async function showResults(value) {
    result = value;
    player = new SynchronizedPlayer(value);
    output.hidden = false;
    const heading = el("div", void 0, "results-heading"), both = el("button", t.both, "primary"), zip = el("button", t.zip);
    heading.append(el("h2", t.results), both, zip);
    output.append(heading, el("p", `${value.vocals.duration.toFixed(2)}s \xB7 44.1 kHz \xB7 ${value.metadata.backend.toUpperCase()} \xB7 ${value.metadata.inferenceSeconds.toFixed(1)}s inference`, "model-info"));
    const updates = [];
    const tick = () => {
      for (const update of updates) update();
      both.textContent = player?.playing && player.playbackMode === "both" ? t.pauseBoth : t.both;
      if (player?.playing) frame = requestAnimationFrame(tick);
    };
    const playback = async (name) => {
      try {
        if (player?.playing && player.playbackMode === name) player.pause();
        else await player?.play(name);
        cancelAnimationFrame(frame);
        tick();
      } catch (error) {
        status.textContent = String(error);
      }
    };
    both.onclick = () => void playback("both");
    zip.onclick = async () => {
      zip.disabled = true;
      try {
        download(await value.exportZip(file?.name), safeFilename(file?.name) + "_stems.zip");
      } catch (error) {
        status.textContent = String(error);
      } finally {
        zip.disabled = false;
      }
    };
    const preferred = choices.querySelector("input:checked").value;
    for (const name of [preferred, preferred === "vocals" ? "instrumental" : "vocals"]) {
      const row = el("article", void 0, "stem-card"), title = el("h3", t[name]), canvas = el("canvas");
      canvas.width = 1e3;
      canvas.height = 120;
      canvas.setAttribute("aria-label", `${t[name]} ${t.waveform}`);
      const peaks = waveformPeaks(value[name].channels, 500), ctx = canvas.getContext("2d");
      const seek = el("input");
      seek.type = "range";
      seek.min = "0";
      seek.max = String(value[name].duration);
      seek.step = ".01";
      seek.value = "0";
      seek.setAttribute("aria-label", `${t[name]} ${t.seek}`);
      const controls = el("div", void 0, "player-controls"), play = el("button", t.play), clock = el("span", `0:00 / ${time(value[name].duration)}`), volume = el("input");
      volume.type = "range";
      volume.min = "0";
      volume.max = "1";
      volume.step = ".01";
      volume.value = "1";
      volume.setAttribute("aria-label", `${t[name]} ${t.volume}`);
      const mute = el("button", t.mute), wav = el("button", t.wav);
      mute.setAttribute("aria-pressed", "false");
      volume.oninput = () => player?.volume(name, Number(volume.value));
      mute.onclick = () => {
        const active = mute.getAttribute("aria-pressed") !== "true";
        mute.setAttribute("aria-pressed", String(active));
        player?.mute(name, active);
      };
      play.onclick = () => void playback(name);
      wav.onclick = () => download(value.exportWav(name), safeFilename(file?.name) + "_" + name + ".wav");
      seek.oninput = () => {
        void player?.seek(Number(seek.value)).then(() => {
          cancelAnimationFrame(frame);
          tick();
        }).catch((error) => {
          status.textContent = String(error);
        });
      };
      const draw = () => {
        const fraction = (player?.currentTime ?? 0) / value[name].duration;
        ctx.clearRect(0, 0, 1e3, 120);
        for (let i = 0; i < peaks.length; i++) {
          ctx.fillStyle = i / peaks.length < fraction ? "#bda4ef" : "#5a526b";
          const height = Math.max(1, Math.min(1, peaks[i]) * 110);
          ctx.fillRect(i * 2, 60 - height / 2, 1, height);
        }
        clock.textContent = `${time(player?.currentTime ?? 0)} / ${time(value[name].duration)}`;
        seek.value = String(player?.currentTime ?? 0);
        play.textContent = player?.playing && (player.playbackMode === name || player.playbackMode === "both") ? t.pause : t.play;
      };
      controls.append(play, clock, el("span", t.volume), volume, mute, wav);
      row.append(title, canvas, seek, controls);
      output.append(row);
      updates.push(draw);
    }
    tick();
  }
  start.onclick = async () => {
    if (busy) return;
    if (!file) {
      status.textContent = t.empty;
      input.focus();
      return;
    }
    if (result && processedFile === file && processedBackend === backend.value && result.metadata.model === select.value) {
      output.scrollIntoView({ block: "start" });
      status.textContent = t.complete;
      return;
    }
    setBusy(true);
    controller = new AbortController();
    const token = ++generation;
    try {
      await clearResults();
      await engine?.dispose();
      engine = await createSeparator({ model: select.value, backend: backend.value, maxDuration: 60, maxFileBytes: 24 * 1024 * 1024, ...options });
      const value = await engine.separate(file, { signal: controller.signal, onProgress: report });
      if (token !== generation || destroyed) {
        value.dispose();
        return;
      }
      await showResults(value);
      processedFile = file;
      processedBackend = backend.value;
      status.textContent = t.complete;
      void updateStorage();
    } catch (error) {
      if (!destroyed) {
        const code = error instanceof Error && "code" in error ? String(error.code) : "";
        const messages = { ABORTED: t.canceled, LIMIT: t.limitError, DECODE: t.decodeError, MODEL: t.modelError, INTEGRITY: t.modelError, RUNTIME: t.runtimeError, WORKER: t.runtimeError, UNSUPPORTED: t.browserError };
        status.textContent = messages[code] ?? t.failed;
      }
    } finally {
      if (!destroyed) setBusy(false);
    }
  };
  cancel.onclick = () => controller?.abort();
  clear.onclick = async () => {
    try {
      await (engine ?? await createSeparator()).clearCache();
      status.textContent = t.cleared;
      await updateStorage();
    } catch (error) {
      status.textContent = `${t.cacheError} ${String(error)}`;
    }
  };
  const destroy = async () => {
    destroyed = true;
    ++generation;
    controller?.abort();
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
mountStudio(root, strings, { workerUrl: "/audio-separator-worker.js?v=b09dd2e7d8f7" });
