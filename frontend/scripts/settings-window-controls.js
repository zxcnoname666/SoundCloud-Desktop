// Window controls style manager for settings window
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
      // Apply default style
      applyWindowControlsStyle('macos');
    }
  }

  function applyWindowControlsStyle(style) {
    const titlebar = document.querySelector('.titlebar');
    const trafficLights = document.querySelector('.traffic-lights');

    if (!titlebar || !trafficLights) return;

    if (style === 'macos') {
      // macOS style: traffic lights on the left
      titlebar.style.flexDirection = 'row';
      trafficLights.style.flexDirection = 'row';
    } else {
      // Windows style: controls on the right
      titlebar.style.flexDirection = 'row-reverse';
      trafficLights.style.flexDirection = 'row-reverse';
    }

    currentStyle = style;
  }

  // Listen for style changes
  if (typeof window.ipcRenderer !== 'undefined') {
    window.ipcRenderer.on('ui:window-controls-style-changed', (event, style) => {
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
