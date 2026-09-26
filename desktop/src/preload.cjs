const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('zenith', {
  settings: { get: () => ipcRenderer.invoke('settings:get'), save: (value) => ipcRenderer.invoke('settings:save', value) },
  pickFolder: () => ipcRenderer.invoke('folder:choose'),
  inspect: (url) => ipcRenderer.invoke('media:inspect', url),
  start: (job) => ipcRenderer.invoke('download:start', job),
  cancel: (id) => ipcRenderer.invoke('download:cancel', id),
  openDownloads: () => ipcRenderer.invoke('folder:open'),
  tools: () => ipcRenderer.invoke('app:tools'),
  updateYtDlp: (channel) => ipcRenderer.invoke('engine:update', channel),
  cookies: { login: (url) => ipcRenderer.invoke('cookies:login', url), save: () => ipcRenderer.invoke('cookies:save'), clear: () => ipcRenderer.invoke('cookies:clear') },
  onDownload: (callback) => ipcRenderer.on('download:event', (_, event) => callback(event)),
  onCookiesUpdated: (callback) => ipcRenderer.on('cookies:updated', (_, event) => callback(event)),
  onEngineUpdated: (callback) => ipcRenderer.on('engine:updated', (_, event) => callback(event))
});
