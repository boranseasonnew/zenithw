const { contextBridge, ipcRenderer } = require('electron');
const invoke = channel => (...args) => ipcRenderer.invoke(channel, ...args);
const listen = channel => callback => {
  const listener = (_, event) => callback(event);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};
contextBridge.exposeInMainWorld('zenith', {
  settings: { get: invoke('settings:get'), save: invoke('settings:save'), export: invoke('settings:export'), import: invoke('settings:import') },
  profiles: { list: invoke('profiles:list'), save: invoke('profiles:save'), load: invoke('profiles:load') },
  scripts: { get: invoke('scripts:get'), choose: invoke('scripts:choose'), clear: invoke('scripts:clear') },
  history: { get: invoke('history:get'), open: invoke('history:open') },
  pickFolder: invoke('folder:choose'), inspect: invoke('media:inspect'),
  start: invoke('download:start'), cancel: invoke('download:cancel'),
  openDownloads: invoke('folder:open'), tools: invoke('app:tools'), updateYtDlp: invoke('engine:update'),
  cookies: { login: invoke('cookies:login'), save: invoke('cookies:save'), clear: invoke('cookies:clear'), import: invoke('cookies:import') },
  onDownload: listen('download:event'), onCookiesUpdated: listen('cookies:updated'), onEngineUpdated: listen('engine:updated')
});
