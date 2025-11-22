// Settings window launcher

function openSettingsModal() {
  if (typeof ipcRenderer !== 'undefined') {
    ipcRenderer.send('settings:open');
  } else {
    console.error('ipcRenderer not available');
  }
}
