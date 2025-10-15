import {app, BrowserWindow, ipcMain, webContents} from 'electron';
import {ConfigManager} from '../utils/config.js';
import {Extensions} from './Extensions.js';
import {Server} from './Server.js';
import {Version} from './Version.js';

export class AppManager {
  private isPlaying = false;
  private isActive = false;
  private configManager: ConfigManager;

  constructor() {
    this.configManager = ConfigManager.getInstance();
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  setIsPlaying(playing: boolean): void {
    this.isPlaying = playing;
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  setIsActive(active: boolean): void {
    this.isActive = active;
  }

  getCloseAll(): boolean {
    return process.argv.includes('--close-all');
  }

  getStartArgsUrl(): string {
    const urlArg = process.argv.find((arg) => arg.startsWith('sc://'));
    return urlArg || '';
  }

  async getStartUrl(): Promise<string> {
    const argsUrl = this.getStartArgsUrl();
    if (argsUrl) {
      return argsUrl.replace('sc://', 'https://soundcloud.com/');
    }
    return 'https://soundcloud.com/discover';
  }

  setupTasks(): void {
    ipcMain.handle('app:get-version', () => {
      return app.getVersion();
    });

    ipcMain.handle('app:get-locale', () => {
      return app.getLocale();
    });

      ipcMain.handle('app:get-translations', () => {
          return Extensions.getTranslations();
      });

    ipcMain.on('app:set-playing', (_event, playing: boolean) => {
      this.setIsPlaying(playing);
    });

    ipcMain.on('app:set-active', (_event, active: boolean) => {
      this.setIsActive(active);
    });

    ipcMain.handle('app:quit', () => {
      app.quit();
    });

    // Window operations
    ipcMain.on('window:close', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        focusedWindow.close();
      }
    });

    ipcMain.on('window:minimize', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        focusedWindow.minimize();
      }
    });

    ipcMain.on('window:maximize', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        if (focusedWindow.isMaximized()) {
          focusedWindow.unmaximize();
        } else {
          focusedWindow.maximize();
        }
      }
    });

    // Webview operations - отправка событий в webview
    ipcMain.on('webview:back', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        // Найти webview в окне и отправить событие туда
        const webviews = webContents
          .getAllWebContents()
          .filter((wc: Electron.WebContents) => wc.getType() === 'webview');
        for (const webview of webviews) {
          webview.send('webview:back');
        }
      }
    });

    ipcMain.on('webview:forward', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        const webviews = webContents
          .getAllWebContents()
          .filter((wc: Electron.WebContents) => wc.getType() === 'webview');
        for (const webview of webviews) {
          webview.send('webview:forward');
        }
      }
    });

    ipcMain.on('webview:reload', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        const webviews = webContents
          .getAllWebContents()
          .filter((wc: Electron.WebContents) => wc.getType() === 'webview');
        for (const webview of webviews) {
          webview.send('webview:reload');
        }
      }
    });

    ipcMain.on('webview:navigate', (_event, url: string) => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        focusedWindow.webContents.send('webview:navigate', url);
      }
    });

    // Webview events from renderer
    ipcMain.on('webview:url-changed', (_event, url: string) => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        const shortUrl = url.replace('https://soundcloud.com/', '');
        focusedWindow.webContents.send('webview:url-changed', shortUrl);
      }
    });

    ipcMain.on('webview:navigation-state-changed', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        focusedWindow.webContents.send('webview:navigation-state-changed', true, true);
      }
    });

    // Forward auth events from webview to main window
    ipcMain.on('auth:token-invalid', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        focusedWindow.webContents.send('auth:token-invalid');
      }
    });
  }

  async performAutoUpdate(): Promise<void> {
    try {
      const config = this.configManager.getConfig();
      if (config.autoUpdate) {
        await Version.checkForUpdates();
      }
    } catch (error) {
      console.warn('Auto-update failed:', error);
    }
  }

  async startServer(port: number, window: BrowserWindow): Promise<void> {
    const server = new Server();
    await server.start(port, window);
  }
}
