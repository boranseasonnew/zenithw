const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

function loadMain({ directory, childProcess = require('node:child_process'), onEvent = () => {}, electronOverrides = {} }) {
  const main = path.resolve(__dirname, '../src/main.cjs');
  // Tests keep tool-existence validation active using disposable fixture files.
  // They must not depend on locally staged release binaries or download tools.
  const runtime = path.join(directory, 'test-runtime');
  fs.mkdirSync(path.join(runtime, 'resources/bin'), { recursive: true });
  for (const tool of ['yt-dlp.exe','ffmpeg.exe','ffprobe.exe','deno.exe','aria2c.exe']) {
    fs.writeFileSync(path.join(runtime, 'resources/bin', tool), 'test fixture, never execute');
  }
  const paths = { appData: directory, userData: directory, temp: directory, downloads: directory };
  const handlers = new Map();
  const electron = {
    app: { isPackaged: false, setPath: (key, value) => { paths[key] = value; }, getPath: key => paths[key],
      setAppUserModelId() {}, getVersion: () => require('../package.json').version, getLocale: () => 'en', whenReady: () => ({ then() {} }), on() {} },
    ipcMain: { handle: (key, handler) => handlers.set(key, handler) }, session: {}, BrowserWindow: {}, dialog: {}, shell: {}
  };
  Object.assign(electron,electronOverrides);
  const localRequire = createRequire(main);
  const context = vm.createContext({ require: key => key === 'electron' ? electron : key === 'node:child_process' ? childProcess : localRequire(key),
    __dirname: path.join(runtime, 'src'), process, console, Buffer, URL, AbortController, TextDecoder, TextEncoder,
    setTimeout: (fn, ms, ...args) => setTimeout(fn, ms, ...args).unref(), clearTimeout, setImmediate, clearImmediate,
    fetch: async () => { throw new Error('Network disabled in main-process test harness'); } });
  vm.runInContext(fs.readFileSync(main, 'utf8') + `\n globalThis.testAPI = {
    downloadArgs, baseArgs, resource, defaults, activeJobs, resetSessionHistory, remember, publishMedia, readSettings, syncSleepBlocker, releaseJob, emit, syncTray,
    initialize(value) { settings = { ...defaults, downloadFolder: ${JSON.stringify(directory)}, ...value }; mainWindow = { isDestroyed: () => false, webContents: { send: (_channel, event) => onEvent(event) } }; },
    invoke(channel, ...args) { return handlers.get(channel)({ sender: mainWindow.webContents }, ...args); }
  };`, Object.assign(context, { handlers, onEvent }));
  return context.testAPI;
}
module.exports = { loadMain };
