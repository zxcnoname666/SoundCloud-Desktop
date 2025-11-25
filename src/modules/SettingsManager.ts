import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BrowserWindow, app, ipcMain } from 'electron';
import { Extensions } from './Extensions.js';

const CUSTOM_STYLES_FILE = join(app.getPath('appData'), 'soundcloud', 'custom-styles.css');

const DEFAULT_CSS = `/* SoundCloud Desktop - Custom Styles */
/* Add your custom CSS here to customize the appearance of SoundCloud */

/* Example: Change the background color */
/* body {
  background: linear-gradient(135deg, #1a1a2e, #16213e) !important;
} */

/* Example: Customize the play button */
/* .playButton {
  background: linear-gradient(135deg, #ff5500, #ff7733) !important;
} */

/* Your custom styles: */

`;

export class SettingsManager {
  private static instance: SettingsManager;
  private window: BrowserWindow | null = null;
  private mainWindow: BrowserWindow | null = null;

  private constructor() {
    this.setupIPC();
  }

  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  setMainWindow(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;
  }

  async openSettings(): Promise<void> {
    if (this.window && !this.window.isDestroyed()) {
      this.window.focus();
      return;
    }

    this.window = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      show: false,
      frame: false,
      transparent: false,
      backgroundColor: '#1a1a1d',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        preload: join(app.getAppPath(), 'frontend/preloads/settings.js'),
      },
      icon: join(app.getAppPath(), 'icons/appLogo.png'),
      titleBarStyle: 'hidden',
    });

    this.window.loadFile(join(app.getAppPath(), 'frontend/settings.html'));

    this.window.once('ready-to-show', () => {
      this.window?.show();
    });

    this.window.on('closed', () => {
      this.window = null;
    });
  }

  private setupIPC(): void {
    // Load CSS from file
    ipcMain.handle('settings:load-css', async () => {
      return await this.loadCustomCSS();
    });

    // Get default CSS
    ipcMain.handle('settings:get-default-css', () => {
      return DEFAULT_CSS;
    });

    // Save CSS to file
    ipcMain.handle('settings:save-css', async (_event, css: string) => {
      try {
        await this.saveCustomCSS(css);
        // Apply to main window
        await this.applyCustomCSS(css);
        return { success: true };
      } catch (error) {
        console.error('Failed to save CSS:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // Preview CSS in real-time
    ipcMain.on('settings:preview-css', async (_event, css: string) => {
      await this.injectCSS(css, false);
    });

    // Window controls
    ipcMain.on('settings:close', () => {
      if (this.window && !this.window.isDestroyed()) {
        this.window.close();
      }
    });

    ipcMain.on('settings:minimize', () => {
      if (this.window && !this.window.isDestroyed()) {
        this.window.minimize();
      }
    });

    ipcMain.on('settings:maximize', () => {
      if (this.window && !this.window.isDestroyed()) {
        if (this.window.isMaximized()) {
          this.window.unmaximize();
        } else {
          this.window.maximize();
        }
      }
    });

    ipcMain.handle('settings:get-translations', () => {
      return Extensions.getTranslations().settings;
    });
  }

  private async loadCustomCSS(): Promise<string> {
    try {
      if (existsSync(CUSTOM_STYLES_FILE)) {
        const css = await readFile(CUSTOM_STYLES_FILE, 'utf-8');
        return css;
      }
    } catch (error) {
      console.error('Failed to load custom CSS:', error);
    }
    return DEFAULT_CSS;
  }

  private async saveCustomCSS(css: string): Promise<void> {
    await writeFile(CUSTOM_STYLES_FILE, css, 'utf-8');
  }

  async applyCustomCSS(css?: string): Promise<void> {
    const cssToApply = css || (await this.loadCustomCSS());
    await this.injectCSS(cssToApply, true);
  }

  private async injectCSS(css: string, persistent: boolean): Promise<void> {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    try {
      // Find webview element and inject CSS
      const code = `
        (function() {
          const webview = document.querySelector('webview');
          if (webview && webview.executeJavaScript) {
            const css = ${JSON.stringify(css)};
            const isPersistent = ${persistent};

            webview.executeJavaScript(\`
              (function() {
                let styleEl = document.getElementById('soundcloud-custom-styles');

                if (!styleEl) {
                  styleEl = document.createElement('style');
                  styleEl.id = 'soundcloud-custom-styles';
                  document.head.appendChild(styleEl);
                }

                styleEl.textContent = \${JSON.stringify(css)};

                // Save to localStorage if persistent
                if (\${isPersistent}) {
                  try {
                    localStorage.setItem('soundcloud-custom-styles', \${JSON.stringify(css)});
                  } catch (e) {
                    console.error('Failed to save custom styles to localStorage:', e);
                  }
                }
              })();
            \`);
          }
        })();
      `;

      await this.mainWindow.webContents.executeJavaScript(code);
    } catch (error) {
      console.error('Failed to inject CSS:', error);
    }
  }

  initializeCustomStyles(): void {
    // Apply custom styles when webview is ready (non-blocking)
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    // Wait for window to be ready, then apply styles
    this.mainWindow.webContents.once('did-finish-load', () => {
      // Give it a moment for webview to initialize
      setTimeout(() => {
        this.applyCustomCSS().catch((error) => {
          console.error('Failed to apply custom styles:', error);
        });
      }, 1000);
    });
  }
}
