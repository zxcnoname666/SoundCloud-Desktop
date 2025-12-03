let editor = null;
let originalCSS = '';
let translations = null;
let currentWindowStyle = 'macos';

document.addEventListener('DOMContentLoaded', async () => {
  // Load translations first
  if (typeof window.settingsAPI !== 'undefined') {
    translations = await window.settingsAPI.getTranslations();
    applyTranslations();
  }

  await initializeMonaco();
  setupEventListeners();
  await loadDataSizes();
    await loadUIPreferences();
    setupWindowControlsStyleSelector();
});

function applyTranslations() {
  if (!translations) return;

  // Window title
  const windowTitle = document.querySelector('.window-title');
  if (windowTitle) windowTitle.textContent = translations.settings_window_title || 'Settings';

  // Settings title
  const settingsTitle = document.querySelector('.settings-title');
  if (settingsTitle) settingsTitle.textContent = translations.settings_title || 'Custom Styles';

  // Settings subtitle
  const settingsSubtitle = document.querySelector('.settings-subtitle');
  if (settingsSubtitle)
    settingsSubtitle.textContent =
      translations.settings_subtitle || 'Customize the appearance of SoundCloud with CSS';

  // Editor label
  const editorLabel = document.querySelector('.editor-label');
  if (editorLabel) {
    // Keep the SVG icon, just update the text
    const svg = editorLabel.querySelector('svg');
    editorLabel.textContent = translations.settings_editor_label || 'CSS Editor';
    if (svg) editorLabel.prepend(svg);
  }

  // Buttons
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) resetBtn.textContent = translations.settings_btn_reset || 'Reset to Default';

  const cancelBtn = document.getElementById('cancelBtn');
  if (cancelBtn) cancelBtn.textContent = translations.settings_btn_cancel || 'Cancel';

  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) saveBtn.textContent = translations.settings_btn_save || 'Save & Apply';

  // Data management section
    const sectionTitle = document.querySelector('.data-management-section .section-title');
  if (sectionTitle)
    sectionTitle.textContent = translations.settings_section_data || 'Data Management';

    const sectionSubtitle = document.querySelector('.data-management-section .section-subtitle');
  if (sectionSubtitle)
    sectionSubtitle.textContent =
      translations.settings_section_data_subtitle || 'Clear cache and user data';

  // Cache card
    const cacheCardTitle = document.querySelector(
        '.data-management-section .data-card:first-child .card-title'
    );
  if (cacheCardTitle)
    cacheCardTitle.textContent = translations.settings_btn_clear_cache || 'Clear Cache';

    const cacheCardDesc = document.querySelector(
        '.data-management-section .data-card:first-child .card-description'
    );
  if (cacheCardDesc)
    cacheCardDesc.textContent =
      translations.settings_btn_clear_cache_desc || 'Remove cached files and request data';

  const clearCacheBtn = document.getElementById('clearCacheBtn');
  if (clearCacheBtn) {
    clearCacheBtn.innerHTML = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
      </svg>
      ${translations.settings_btn_clear_cache || 'Clear Cache'}
    `;
  }

  // AppData card
    const appDataCardTitle = document.querySelector(
        '.data-management-section .data-card:last-child .card-title'
    );
  if (appDataCardTitle)
    appDataCardTitle.textContent = translations.settings_btn_clear_appdata || 'Clear All Data';

    const appDataCardDesc = document.querySelector(
        '.data-management-section .data-card:last-child .card-description'
    );
  if (appDataCardDesc)
    appDataCardDesc.textContent =
      translations.settings_btn_clear_appdata_desc || 'Remove all user settings and styles';

  const clearAppDataBtn = document.getElementById('clearAppDataBtn');
  if (clearAppDataBtn) {
    clearAppDataBtn.innerHTML = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M14.5,9L15.9,10.4L13.3,13L15.9,15.6L14.5,17L11.9,14.4L9.3,17L7.9,15.6L10.5,13L7.9,10.4L9.3,9L11.9,11.6L14.5,9Z"/>
      </svg>
      ${translations.settings_btn_clear_appdata || 'Clear All Data'}
    `;
  }
}

async function initializeMonaco() {
  // Load Monaco Editor
  require.config({
    paths: {
      vs: '../node_modules/monaco-editor/min/vs',
    },
  });

  return new Promise((resolve) => {
    require(['vs/editor/editor.main'], async () => {
      // Define custom SoundCloud dark theme
      monaco.editor.defineTheme('soundcloud-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6A737D', fontStyle: 'italic' },
          { token: 'keyword', foreground: 'FF7733', fontStyle: 'bold' },
          { token: 'string', foreground: '9ECBFF' },
          { token: 'number', foreground: '79B8FF' },
          { token: 'type', foreground: 'B392F0' },
          { token: 'class', foreground: 'FF9966' },
          { token: 'function', foreground: 'FFB366' },
          { token: 'variable', foreground: 'E1E4E8' },
          { token: 'constant', foreground: '79B8FF' },
          { token: 'property', foreground: 'FFD580' },
          { token: 'operator', foreground: 'F97583' },
          { token: 'tag', foreground: 'FF5500' },
          { token: 'attribute.name', foreground: 'FF9966' },
          { token: 'attribute.value', foreground: '9ECBFF' },
        ],
        colors: {
          'editor.background': '#0d0d0f',
          'editor.foreground': '#e1e4e8',
          'editorLineNumber.foreground': '#444d56',
          'editorLineNumber.activeForeground': '#ff7733',
          'editor.lineHighlightBackground': '#1a1a1d',
          'editor.selectionBackground': '#ff550033',
          'editor.inactiveSelectionBackground': '#ff550019',
          'editor.selectionHighlightBackground': '#ff550019',
          'editorCursor.foreground': '#ff5500',
          'editorWhitespace.foreground': '#444d56',
          'editorIndentGuide.background': '#2f363d',
          'editorIndentGuide.activeBackground': '#ff550033',
          'editorBracketMatch.background': '#ff550033',
          'editorBracketMatch.border': '#ff7733',
          'scrollbar.shadow': '#00000000',
          'scrollbarSlider.background': '#ff550033',
          'scrollbarSlider.hoverBackground': '#ff550066',
          'scrollbarSlider.activeBackground': '#ff5500',
        },
      });

      // Get initial CSS from IPC
      if (typeof window.settingsAPI !== 'undefined') {
        originalCSS = await window.settingsAPI.loadCSS();
      }

      // Create editor instance
      editor = monaco.editor.create(document.getElementById('monaco-editor'), {
        value: originalCSS,
        language: 'css',
        theme: 'soundcloud-dark',
        fontSize: 14,
        fontFamily: '"SF Mono", "Monaco", "Consolas", "Courier New", monospace',
        lineNumbers: 'on',
        roundedSelection: true,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        minimap: {
          enabled: true,
          maxColumn: 80,
          renderCharacters: false,
        },
        scrollbar: {
          vertical: 'visible',
          horizontal: 'visible',
          useShadows: false,
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
        bracketPairColorization: {
          enabled: true,
        },
        guides: {
          bracketPairs: true,
          indentation: true,
        },
        tabSize: 2,
        insertSpaces: true,
        wordWrap: 'on',
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
      });

      // Listen for changes and apply real-time preview
      editor.onDidChangeModelContent(() => {
        const css = editor.getValue();
        if (typeof window.settingsAPI !== 'undefined') {
          window.settingsAPI.previewCSS(css);
        }
      });

      resolve();
    });
  });
}

function setupEventListeners() {
  // Close button
  const closeBtn = document.getElementById('closeBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      // Revert to original CSS (non-blocking, fire and forget)
      if (typeof window.settingsAPI !== 'undefined') {
        try {
          window.settingsAPI.previewCSS(originalCSS);
        } catch (error) {
          // Ignore errors
          console.debug('Failed to revert CSS:', error);
        }
      }
      // Close immediately without waiting
      setTimeout(() => closeWindow(), 100);
    });
  }

  // Minimize button
  const minimizeBtn = document.getElementById('minimizeBtn');
  if (minimizeBtn) {
    minimizeBtn.addEventListener('click', () => {
      if (typeof window.settingsAPI !== 'undefined') {
        window.settingsAPI.minimize();
      }
    });
  }

  // Maximize button
  const maximizeBtn = document.getElementById('maximizeBtn');
  if (maximizeBtn) {
    maximizeBtn.addEventListener('click', () => {
      if (typeof window.settingsAPI !== 'undefined') {
        window.settingsAPI.maximize();
      }
    });
  }

  // Cancel button
  const cancelBtn = document.getElementById('cancelBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      // Revert to original CSS (non-blocking, fire and forget)
      if (typeof window.settingsAPI !== 'undefined') {
        try {
          window.settingsAPI.previewCSS(originalCSS);
        } catch (error) {
          // Ignore errors
          console.debug('Failed to revert CSS:', error);
        }
      }
      // Close immediately without waiting
      setTimeout(() => closeWindow(), 100);
    });
  }

  // Save button
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const css = editor.getValue();

      if (typeof window.settingsAPI !== 'undefined') {
        const result = await window.settingsAPI.saveCSS(css);

        if (result.success) {
          showStatus('Settings saved successfully!', 'success');
          originalCSS = css;

          // Close window after short delay
          setTimeout(() => {
            closeWindow();
          }, 1000);
        } else {
          showStatus(`Failed to save settings: ${result.error}`, 'error');
        }
      }
    });
  }

  // Reset button
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (typeof window.settingsAPI !== 'undefined') {
        const defaultCSS = await window.settingsAPI.getDefaultCSS();
        editor.setValue(defaultCSS);
        showStatus(translations?.settings_status_reset || 'Reset to default styles', 'success');
      }
    });
  }

  // Clear cache button
  const clearCacheBtn = document.getElementById('clearCacheBtn');
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', async () => {
      if (typeof window.settingsAPI === 'undefined') return;

      const confirmed = confirm(
        translations?.settings_confirm_clear_cache ||
          'Are you sure you want to clear the cache? This may slow down the app on next launch.'
      );

      if (!confirmed) return;

      clearCacheBtn.disabled = true;
      clearCacheBtn.textContent = 'Clearing...';

      try {
        const result = await window.settingsAPI.clearCache();
        if (result.success) {
          showStatus(
            translations?.settings_cache_cleared || 'Cache cleared successfully!',
            'success'
          );
          await loadDataSizes();
        } else {
          showStatus(`Failed to clear cache: ${result.error}`, 'error');
        }
      } catch (error) {
        showStatus(`Failed to clear cache: ${error}`, 'error');
      } finally {
        clearCacheBtn.disabled = false;
        clearCacheBtn.innerHTML = `
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
          </svg>
          ${translations?.settings_btn_clear_cache || 'Clear Cache'}
        `;
      }
    });
  }

  // Clear AppData button
  const clearAppDataBtn = document.getElementById('clearAppDataBtn');
  if (clearAppDataBtn) {
    clearAppDataBtn.addEventListener('click', async () => {
      if (typeof window.settingsAPI === 'undefined') return;

      const confirmed = confirm(
        translations?.settings_confirm_clear_appdata ||
          'Are you sure you want to delete ALL application data? This action cannot be undone!\n\nThis will remove:\n• Custom CSS styles\n• All settings\n• Cached data'
      );

      if (!confirmed) return;

      clearAppDataBtn.disabled = true;
      clearAppDataBtn.textContent = 'Clearing...';

      try {
        const result = await window.settingsAPI.clearAppData();
        if (result.success) {
          showStatus(
            translations?.settings_appdata_cleared || 'All application data cleared successfully!',
            'success'
          );
          // Reload original CSS after clearing appdata
          originalCSS = '';
          editor.setValue(await window.settingsAPI.getDefaultCSS());
          await loadDataSizes();
        } else {
          showStatus(`Failed to clear data: ${result.error}`, 'error');
        }
      } catch (error) {
        showStatus(`Failed to clear data: ${error}`, 'error');
      } finally {
        clearAppDataBtn.disabled = false;
        clearAppDataBtn.innerHTML = `
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M14.5,9L15.9,10.4L13.3,13L15.9,15.6L14.5,17L11.9,14.4L9.3,17L7.9,15.6L10.5,13L7.9,10.4L9.3,9L11.9,11.6L14.5,9Z"/>
          </svg>
          ${translations?.settings_btn_clear_appdata || 'Clear All Data'}
        `;
      }
    });
  }
}

function showStatus(message, type) {
  const statusEl = document.getElementById('statusMessage');
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.className = `status-message show ${type}`;

  setTimeout(() => {
    statusEl.classList.remove('show');
  }, 3000);
}

function closeWindow() {
  if (typeof window.settingsAPI !== 'undefined') {
    window.settingsAPI.closeWindow();
  }
}

async function loadDataSizes() {
  if (typeof window.settingsAPI === 'undefined') return;

  try {
    // Load cache size
    const cacheResult = await window.settingsAPI.getCacheSize();
    const cacheSizeEl = document.getElementById('cacheSize');
    if (cacheSizeEl) {
      if (cacheResult.success) {
        cacheSizeEl.textContent =
          translations?.settings_cache_size.replace('{size}', cacheResult.size) ||
          `Cache size: ${cacheResult.size}`;
      } else {
        cacheSizeEl.textContent = 'N/A';
      }
    }

    // Load appdata size
    const appDataResult = await window.settingsAPI.getAppDataSize();
    const appDataSizeEl = document.getElementById('appDataSize');
    if (appDataSizeEl) {
      if (appDataResult.success) {
        appDataSizeEl.textContent =
          translations?.settings_appdata_size.replace('{size}', appDataResult.size) ||
          `Data size: ${appDataResult.size}`;
      } else {
        appDataSizeEl.textContent = 'N/A';
      }
    }
  } catch (error) {
    console.error('Failed to load data sizes:', error);
  }
}

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  if (editor) {
    editor.dispose();
  }
});

// Window Controls Style functions
async function loadUIPreferences() {
    if (typeof window.settingsAPI === 'undefined') return;

    try {
        const result = await window.settingsAPI.getUIPreferences();
        if (result.success && result.preferences) {
            currentWindowStyle = result.preferences.windowControlsStyle || 'macos';
            updateSelectedStyleCard(currentWindowStyle);
        }
    } catch (error) {
        console.error('Failed to load UI preferences:', error);
    }
}

function setupWindowControlsStyleSelector() {
    const macosCard = document.getElementById('macosStyleCard');
    const windowsCard = document.getElementById('windowsStyleCard');

    if (macosCard) {
        macosCard.addEventListener('click', () => selectWindowStyle('macos'));
    }

    if (windowsCard) {
        windowsCard.addEventListener('click', () => selectWindowStyle('windows'));
    }
}

async function selectWindowStyle(style) {
    if (typeof window.settingsAPI === 'undefined') return;

    currentWindowStyle = style;
    updateSelectedStyleCard(style);

    try {
        const result = await window.settingsAPI.saveUIPreferences({
            windowControlsStyle: style,
        });

        if (result.success) {
            showStatus(`Window style changed to ${style === 'macos' ? 'macOS' : 'Windows'}`, 'success');
        } else {
            showStatus(`Failed to save window style: ${result.error}`, 'error');
        }
    } catch (error) {
        showStatus(`Failed to save window style: ${error}`, 'error');
    }
}

function updateSelectedStyleCard(style) {
    const macosCard = document.getElementById('macosStyleCard');
    const windowsCard = document.getElementById('windowsStyleCard');

    if (macosCard && windowsCard) {
        macosCard.classList.toggle('selected', style === 'macos');
        windowsCard.classList.toggle('selected', style === 'windows');
    }
}
