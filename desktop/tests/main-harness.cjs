const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

function loadMain({ directory, childProcess = require('node:child_process'), onEvent = () => {}, electronOverrides = {} }) {
  const main = path.resolve(__dirname, '../src/main.cjs');
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
    __dirname: path.dirname(main), process, console, Buffer, URL, setTimeout, clearTimeout });
  vm.runInContext(fs.readFileSync(main, 'utf8') + `\n globalThis.testAPI = {
    downloadArgs, baseArgs, defaults, activeJobs, resetSessionHistory, remember, publishMedia, readSettings, syncSleepBlocker, releaseJob, emit, syncTray,
    initialize(value) { settings = { ...defaults, downloadFolder: ${JSON.stringify(directory)}, ...value }; mainWindow = { isDestroyed: () => false, webContents: { send: (_channel, event) => onEvent(event) } }; },
    invoke(channel, ...args) { return handlers.get(channel)({ sender: mainWindow.webContents }, ...args); }
  };`, Object.assign(context, { handlers, onEvent }));
  return context.testAPI;
}
module.exports = { loadMain };
