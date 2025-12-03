const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('updateAPI', {
  getUpdateInfo: () => ipcRenderer.invoke('update:get-info'),
  getTranslations: () => ipcRenderer.invoke('update:get-translations'),
  closeWindow: () => ipcRenderer.send('update:close'),
  later: () => ipcRenderer.send('update:later'),
  install: () => ipcRenderer.invoke('update:install'),
  openExternal: (url) => ipcRenderer.send('update:open-external', url),

  // Listen for download progress
  onProgress: (callback) => {
    ipcRenderer.on('update:progress', (_event, data) => {
      callback(data);
    });
  },
});
