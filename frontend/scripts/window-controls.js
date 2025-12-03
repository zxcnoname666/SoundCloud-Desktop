// Window controls style manager for main window
(() => {
  let currentStyle = 'macos';

  // Load UI preferences and apply style
  async function loadAndApplyStyle() {
    if (typeof window.settingsAPI === 'undefined') return;

    try {
      const result = await window.settingsAPI.getUIPreferences();
      if (result.success && result.preferences) {
        currentStyle = result.preferences.windowControlsStyle || 'macos';
        applyWindowControlsStyle(currentStyle);
      }
    } catch (error) {
      console.error('Failed to load UI preferences:', error);
      applyWindowControlsStyle('macos');
    }
  }

  function applyWindowControlsStyle(style) {
    const windowControlsLeft = document.querySelector('.window-controls-left');
    const macosLights = document.querySelector('.traffic-lights.macos-style');
    const windowsControls = document.querySelector('.windows-controls');

    if (!windowControlsLeft || !macosLights || !windowsControls) {
      console.error('Window controls elements not found');
      return;
    }

    if (style === 'macos') {
      // macOS: Show traffic lights on the left, hide Windows controls
      windowControlsLeft.style.display = 'flex';
      macosLights.style.display = 'flex';
      windowsControls.style.display = 'none';
    } else {
      // Windows: Hide macOS traffic lights, show Windows controls on the right
      windowControlsLeft.style.display = 'none';
      macosLights.style.display = 'none';
      windowsControls.style.display = 'flex';
    }

    currentStyle = style;
    console.info(`Applied window controls style: ${style}`);
  }

  // Listen for style changes from settings
  if (typeof window.ipcRenderer !== 'undefined') {
    window.ipcRenderer.on('ui:window-controls-style-changed', (event, style) => {
      console.info(`Received style change event: ${style}`);
      applyWindowControlsStyle(style);
    });
  }

  // Apply style on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAndApplyStyle);
  } else {
    loadAndApplyStyle();
  }
})();
