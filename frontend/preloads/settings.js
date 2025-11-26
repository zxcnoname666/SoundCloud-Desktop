const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('settingsAPI', {
  // Get translations
  getTranslations: () => ipcRenderer.invoke('settings:get-translations'),

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

    // Data management
    getCacheSize: () => ipcRenderer.invoke('settings:get-cache-size'),
    clearCache: () => ipcRenderer.invoke('settings:clear-cache'),
    getAppDataSize: () => ipcRenderer.invoke('settings:get-appdata-size'),
    clearAppData: () => ipcRenderer.invoke('settings:clear-appdata'),
});
