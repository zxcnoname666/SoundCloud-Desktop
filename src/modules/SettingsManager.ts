import { existsSync, statSync } from 'node:fs';
import { readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BrowserWindow, app, ipcMain, session } from 'electron';
import { AssetCache } from './AssetCache.js';
import { Extensions } from './Extensions.js';

const CUSTOM_STYLES_FILE = join(app.getPath('appData'), 'soundcloud', 'custom-styles.css');
const UI_PREFERENCES_FILE = join(app.getPath('appData'), 'soundcloud', 'ui-preferences.json');

type WindowControlsStyle = 'macos' | 'windows';

interface UIPreferences {
  windowControlsStyle: WindowControlsStyle;
}

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
      height: 990,
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

  /**
   * Load UI preferences from file
   */
  async loadUIPreferences(): Promise<UIPreferences> {
    const defaultPreferences: UIPreferences = {
      windowControlsStyle: 'macos',
    };

    try {
      if (existsSync(UI_PREFERENCES_FILE)) {
        const content = await readFile(UI_PREFERENCES_FILE, 'utf-8');
        const prefs = JSON.parse(content);
        return { ...defaultPreferences, ...prefs };
      }
    } catch (error) {
      console.error('Failed to load UI preferences:', error);
    }

    return defaultPreferences;
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

  /**
   * Get size of directory in bytes
   */
  private async getDirectorySize(dirPath: string): Promise<number> {
    if (!existsSync(dirPath)) {
      return 0;
    }

    let totalSize = 0;

    const calculateSize = async (path: string): Promise<void> => {
      try {
        const stats = statSync(path);

        if (stats.isFile()) {
          totalSize += stats.size;
        } else if (stats.isDirectory()) {
          const files = await readdir(path);
          for (const file of files) {
            await calculateSize(join(path, file));
          }
        }
      } catch (error) {
        console.warn(`Failed to get size of ${path}:`, error);
      }
    };

    await calculateSize(dirPath);
    return totalSize;
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Get cache size
   */
  private async getCacheSize(): Promise<string> {
    // Get AssetCache directory path
    const cachePath = join(app.getPath('temp'), 'soundcloud-cache');
    const size = await this.getDirectorySize(cachePath);
    return this.formatBytes(size);
  }

  /**
   * Clear cache
   */
  private async clearCache(): Promise<void> {
    // Clear AssetCache
    const assetCache = AssetCache.getInstance();
    await assetCache.clearAll();

    // Clear Electron session cache
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      await this.mainWindow.webContents.session.clearCache();
      await this.mainWindow.webContents.session.clearStorageData({
        storages: ['cachestorage', 'serviceworkers'],
      });
    }

    // Clear default session cache
    await session.defaultSession.clearCache();
    await session.defaultSession.clearStorageData({
      storages: ['cachestorage', 'serviceworkers'],
    });
  }

  /**
   * Get AppData size
   */
  private async getAppDataSize(): Promise<string> {
    const appDataPath = join(app.getPath('appData'), 'soundcloud');
    const size = await this.getDirectorySize(appDataPath);
    return this.formatBytes(size);
  }

  /**
   * Clear all AppData
   */
  private async clearAppData(): Promise<void> {
    const appDataPath = join(app.getPath('appData'), 'soundcloud');

    if (existsSync(appDataPath)) {
      await rm(appDataPath, { recursive: true, force: true });
    }
  }

  /**
   * Get current window controls style
   */
  async getWindowControlsStyle(): Promise<WindowControlsStyle> {
    const prefs = await this.loadUIPreferences();
    return prefs.windowControlsStyle;
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
        // Try to close gracefully first
        this.window.close();

        // Fallback: force destroy after timeout (Linux issue #81)
        setTimeout(() => {
          if (this.window && !this.window.isDestroyed()) {
            console.warn('Settings window did not close gracefully, forcing destroy');
            this.window.destroy();
          }
        }, 500);
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

    // Data management handlers
    ipcMain.handle('settings:get-cache-size', async () => {
      try {
        const size = await this.getCacheSize();
        return { success: true, size };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    });

    ipcMain.handle('settings:clear-cache', async () => {
      try {
        await this.clearCache();
        return { success: true };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    });

    ipcMain.handle('settings:get-appdata-size', async () => {
      try {
        const size = await this.getAppDataSize();
        return { success: true, size };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    });

    ipcMain.handle('settings:clear-appdata', async () => {
      try {
        await this.clearAppData();
        return { success: true };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    });

    // UI Preferences handlers
    ipcMain.handle('settings:get-ui-preferences', async () => {
      try {
        const prefs = await this.loadUIPreferences();
        return { success: true, preferences: prefs };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    });

    ipcMain.handle('settings:save-ui-preferences', async (_event, preferences: UIPreferences) => {
      try {
        await this.saveUIPreferences(preferences);
        return { success: true };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    });
  }

  /**
   * Save UI preferences to file
   */
  private async saveUIPreferences(preferences: UIPreferences): Promise<void> {
    const { mkdir } = await import('node:fs/promises');
    const dir = join(app.getPath('appData'), 'soundcloud');

    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    await writeFile(UI_PREFERENCES_FILE, JSON.stringify(preferences, null, 2), 'utf-8');

    // Notify windows to update
    this.applyWindowControlsStyle(preferences.windowControlsStyle);
  }

  /**
   * Apply window controls style to all windows
   */
  private applyWindowControlsStyle(style: WindowControlsStyle): void {
    const windows = [this.mainWindow, this.window].filter((w) => w && !w.isDestroyed());

    for (const win of windows) {
      win?.webContents.send('ui:window-controls-style-changed', style);
    }
  }
}
