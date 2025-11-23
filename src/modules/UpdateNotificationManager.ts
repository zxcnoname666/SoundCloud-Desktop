import { join } from 'node:path';
import { BrowserWindow, app, ipcMain, shell } from 'electron';

interface UpdateInfo {
  version: string;
  changelog: string;
  downloadUrl: string;
  assetName: string;
  assetSize: number;
}

export class UpdateNotificationManager {
  private static instance: UpdateNotificationManager;
  private window: BrowserWindow | null = null;
  private currentUpdateInfo: UpdateInfo | null = null;
  private resolveInstall: ((value: boolean) => void) | null = null;

  private constructor() {
    this.setupIPC();
  }

  static getInstance(): UpdateNotificationManager {
    if (!UpdateNotificationManager.instance) {
      UpdateNotificationManager.instance = new UpdateNotificationManager();
    }
    return UpdateNotificationManager.instance;
  }

  async showUpdateNotification(updateInfo: UpdateInfo): Promise<boolean> {
    this.currentUpdateInfo = updateInfo;

    return new Promise((resolve) => {
      this.resolveInstall = resolve;
      this.createWindow();
    });
  }

  private createWindow(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.focus();
      return;
    }

    this.window = new BrowserWindow({
      width: 600,
      height: 700,
      resizable: false,
      maximizable: false,
      minimizable: false,
      fullscreenable: false,
      show: false,
      frame: false,
      transparent: false,
      backgroundColor: '#1a1a1d',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(app.getAppPath(), 'frontend/preloads/update-notification.js'),
      },
      icon: join(app.getAppPath(), 'icons/appLogo.png'),
      alwaysOnTop: true,
      skipTaskbar: false,
      titleBarStyle: 'hidden',
    });

    this.window.loadFile(join(app.getAppPath(), 'frontend/update-notification.html'));

    this.window.once('ready-to-show', () => {
      this.window?.show();
    });

    this.window.on('closed', () => {
      this.window = null;
      // If window is closed without action, resolve with false
      if (this.resolveInstall) {
        this.resolveInstall(false);
        this.resolveInstall = null;
      }
    });
  }

  private setupIPC(): void {
    ipcMain.handle('update:get-info', () => {
      return this.currentUpdateInfo;
    });

    ipcMain.on('update:close', () => {
      if (this.resolveInstall) {
        this.resolveInstall(false);
        this.resolveInstall = null;
      }
      this.closeWindow();
    });

    ipcMain.on('update:later', () => {
      if (this.resolveInstall) {
        this.resolveInstall(false);
        this.resolveInstall = null;
      }
      this.closeWindow();
    });

    ipcMain.handle('update:install', async () => {
      if (this.resolveInstall) {
        this.resolveInstall(true);
        this.resolveInstall = null;
      }
      return true;
    });

    ipcMain.on('update:open-external', (_event, url: string) => {
      shell.openExternal(url);
    });
  }

  sendProgress(data: { percent: number; downloaded: string; total: string }): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send('update:progress', data);
    }
  }

  private closeWindow(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
    }
    this.window = null;
  }
}
