const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('settingsAPI', {
  // Load current custom CSS
  loadCSS: () => ipcRenderer.invoke('settings:load-css'),

  // Get default CSS
  getDefaultCSS: () => ipcRenderer.invoke('settings:get-default-css'),

  // Save CSS to file
  saveCSS: (css) => ipcRenderer.invoke('settings:save-css', css),

  // Preview CSS in real-time (send to main window webview)
  previewCSS: (css) => ipcRenderer.send('settings:preview-css', css),

  // Window controls
  closeWindow: () => ipcRenderer.send('settings:close'),
  minimize: () => ipcRenderer.send('settings:minimize'),
  maximize: () => ipcRenderer.send('settings:maximize'),
});
