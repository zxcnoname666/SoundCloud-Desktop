let editor = null;
let originalCSS = '';
let translations = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Load translations first
  if (typeof window.settingsAPI !== 'undefined') {
    translations = await window.settingsAPI.getTranslations();
    applyTranslations();
  }

  await initializeMonaco();
  setupEventListeners();
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
    closeBtn.addEventListener('click', async () => {
      // Revert to original CSS
      if (typeof window.settingsAPI !== 'undefined') {
        await window.settingsAPI.previewCSS(originalCSS);
      }
      closeWindow();
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
    cancelBtn.addEventListener('click', async () => {
      // Revert to original CSS
      if (typeof window.settingsAPI !== 'undefined') {
        await window.settingsAPI.previewCSS(originalCSS);
      }
      closeWindow();
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
        showStatus('Reset to default styles', 'success');
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

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  if (editor) {
    editor.dispose();
  }
});
