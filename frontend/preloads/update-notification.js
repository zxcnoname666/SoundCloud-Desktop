const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('updateAPI', {
  getUpdateInfo: () => ipcRenderer.invoke('update:get-info'),
  closeWindow: () => ipcRenderer.send('update:close'),
  later: () => ipcRenderer.send('update:later'),
  install: () => ipcRenderer.invoke('update:install'),
  openExternal: (url) => shell.openExternal(url),

  // Listen for download progress
  onProgress: (callback) => {
    ipcRenderer.on('update:progress', (_event, data) => {
      callback(data);
    });
  }
});
