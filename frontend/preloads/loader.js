const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('loaderAPI', {
  onProgress: (callback) => {
    ipcRenderer.on('loader:progress', (event, data) => callback(data));
  },
});
