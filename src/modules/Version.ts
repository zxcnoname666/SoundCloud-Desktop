import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { type BrowserWindow, app, dialog } from 'electron';
import fetch from 'node-fetch';
import { Extensions } from './Extensions.js';
import { UpdateNotificationManager } from './UpdateNotificationManager.js';

export class Version {
  public major = -1;
  public minor = -1;
  public build = -1;
  public revision = -1;

  constructor(version: string) {
    if (typeof version !== 'string') {
      throw new Error('Version must be a string');
    }

    const parts = version.split('.');

    if (parts.length < 1) {
      throw new Error('Version string must contain at least one part');
    }

    for (let i = 0; i < Math.min(parts.length, 4); i++) {
      const element = Number.parseInt(parts[i]!);

      if (Number.isNaN(element) || element < 0) {
        continue;
      }

      switch (i) {
        case 0:
          this.major = element;
          break;
        case 1:
          this.minor = element;
          break;
        case 2:
          this.build = element;
          break;
        case 3:
          this.revision = element;
          break;
      }
    }
  }

  static async checkForUpdates(loaderWindow?: BrowserWindow): Promise<boolean> {
    try {
      const currentVersion = new Version(app.getVersion());
      const updateInfo = await Version.fetchUpdateInfo();

      if (!updateInfo) {
        return false;
      }

      const remoteVersion = new Version(updateInfo.tag_name);

      if (remoteVersion.isNewerThan(currentVersion)) {
        return await Version.showUpdateDialog(updateInfo, loaderWindow);
      }

      return false;
    } catch (error) {
      console.warn('Update check failed:', error);
      return false;
    }
  }

  private static async fetchUpdateInfo(): Promise<any> {
    try {
      const response = await fetch(
        'https://api.github.com/repos/zxcnoname666/SoundCloud-Desktop/releases/latest',
        { signal: AbortSignal.timeout(15000) } // 15 second timeout to prevent hanging
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('Failed to fetch update info:', error);
      return null;
    }
  }

  private static async showUpdateDialog(
    updateInfo: any,
    loaderWindow?: BrowserWindow
  ): Promise<boolean> {
    // Find asset for current platform
    const asset = Version.findAssetForPlatform(updateInfo.assets);
    if (!asset) {
      console.error(`No installer found for platform: ${process.platform}`);
      return false;
    }

    // Prepare update info for custom window
    const updateNotificationManager = UpdateNotificationManager.getInstance();
    const shouldInstall = await updateNotificationManager.showUpdateNotification({
      version: updateInfo.tag_name,
      changelog: updateInfo.body || 'No release notes available.',
      downloadUrl: asset.browser_download_url,
      assetName: asset.name,
      assetSize: asset.size,
    });

    if (shouldInstall) {
      return await Version.downloadAndInstallUpdate(updateInfo, loaderWindow);
    }

    return false;
  }

  private static async downloadAndInstallUpdate(
    updateInfo: any,
    loaderWindow?: BrowserWindow
  ): Promise<boolean> {
    try {
      const asset = Version.findAssetForPlatform(updateInfo.assets);

      if (!asset) {
        throw new Error(`No installer found for platform: ${process.platform}`);
      }

      const filePath = await Version.downloadFile(
        asset.browser_download_url,
        asset.name,
        asset.size,
        loaderWindow
      );

      if (await Version.verifyFileHash(filePath, Version.getExpectedHash(updateInfo, asset.name))) {
        return await Version.installUpdate(filePath);
      }
      const translations = Extensions.getTranslations().updater;
      dialog.showErrorBox(
        translations.updater_missing_hash,
        translations.updater_missing_hash_message
      );
      return false;
    } catch (error) {
      console.error('Update installation failed:', error);
      const translations = Extensions.getTranslations().updater;
      dialog.showErrorBox(
        translations.updater_installation_error,
        error instanceof Error ? error.message : String(error)
      );
      return false;
    }
  }

  private static async downloadFile(
    url: string,
    filename: string,
    totalSize: number,
    loaderWindow?: BrowserWindow
  ): Promise<string> {
    const filePath = require('node:path').join(require('node:os').tmpdir(), filename);
    const abortController = new AbortController();

    const response = await fetch(url, {
      signal: abortController.signal,
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    // Проверка прогресса загрузки для обхода блокировки РКН
    // (когда пропускают первые N кбайт, а потом держат соединение)
    let downloadedSize = 0;
    let lastProgressTime = Date.now();
    const STALL_TIMEOUT = 30000; // 30 секунд без прогресса = ошибка

    const progressCheckInterval = setInterval(() => {
      const currentTime = Date.now();
      const timeSinceLastProgress = currentTime - lastProgressTime;

      if (timeSinceLastProgress > STALL_TIMEOUT) {
        clearInterval(progressCheckInterval);
        abortController.abort(new Error('Download stalled: no data received for 30 seconds'));
      }
    }, 1000);

    // Функция для форматирования размера файла
    const formatSize = (bytes: number): string => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    try {
      const fileStream = createWriteStream(filePath);

      // Оборачиваем stream для отслеживания прогресса
      const { Transform } = require('node:stream');
      const progressTracker = new Transform({
        transform(chunk: any, _encoding: any, callback: any) {
          const chunkSize = chunk.length;
          if (chunkSize > 0) {
            downloadedSize += chunkSize;
            lastProgressTime = Date.now();

            // Отправляем прогресс в loader window
            if (loaderWindow && !loaderWindow.isDestroyed()) {
              const percent = totalSize > 0 ? Math.round((downloadedSize / totalSize) * 100) : 0;
              loaderWindow.webContents.send('loader:progress', {
                type: 'download',
                percent: percent,
                downloaded: formatSize(downloadedSize),
                total: formatSize(totalSize),
              });
            }

            // Отправляем прогресс в update notification window
            const updateNotificationManager = UpdateNotificationManager.getInstance();
            const percent = totalSize > 0 ? Math.round((downloadedSize / totalSize) * 100) : 0;
            updateNotificationManager.sendProgress({
              percent: percent,
              downloaded: formatSize(downloadedSize),
              total: formatSize(totalSize),
            });
          }
          callback(null, chunk);
        },
      });

      await pipeline(response.body!, progressTracker, fileStream);
      clearInterval(progressCheckInterval);
    } catch (error) {
      clearInterval(progressCheckInterval);
      throw error;
    }

    return filePath;
  }

  private static async verifyFileHash(filePath: string, expectedHash?: string): Promise<boolean> {
    if (!expectedHash) {
      return true; // Skip verification if no hash provided
    }

    return new Promise((resolve) => {
      const hash = createHash('sha256');
      const stream = createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => {
        const fileHash = hash.digest('hex');
        resolve(fileHash === expectedHash);
      });
      stream.on('error', () => resolve(false));
    });
  }

  private static findAssetForPlatform(assets: any[]): any {
    const platform = process.platform;

    // Определяем возможные паттерны для платформы
    let platformPatterns: RegExp[] = [];

    switch (platform) {
      case 'win32':
        platformPatterns = [
          /soundcloud.*\.exe$/i,
          /.*-win.*\.exe$/i,
          /.*-windows.*\.exe$/i,
          /.*setup.*\.exe$/i,
          /.*installer.*\.exe$/i,
        ];
        break;
      case 'darwin':
        platformPatterns = [
          /soundcloud.*\.dmg$/i,
          /.*-mac.*\.dmg$/i,
          /.*-darwin.*\.dmg$/i,
          /.*-macos.*\.dmg$/i,
        ];
        break;
      case 'linux':
        platformPatterns = [
          /soundcloud.*\.AppImage$/i,
          /.*-linux.*\.AppImage$/i,
          /.*\.AppImage$/i,
          /soundcloud.*\.deb$/i,
          /.*-linux.*\.deb$/i,
        ];
        break;
    }

    // Ищем подходящий ассет по регулярным выражениям
    for (const pattern of platformPatterns) {
      const asset = assets.find((a: any) => pattern.test(a.name));
      if (asset) return asset;
    }

    return null;
  }

  private static getExpectedHash(updateInfo: any, fileName: string): string | undefined {
    // Ищем хеш в GitHub Release body (формат: SHA256: hash)
    if (updateInfo.body) {
      const hashMatch = updateInfo.body.match(
        new RegExp(`${fileName}.*?SHA256:\\s*([a-f0-9]{64})`, 'i')
      );
      if (hashMatch) return hashMatch[1];

      // Альтернативный формат: fileName SHA256
      const altHashMatch = updateInfo.body.match(new RegExp(`${fileName}\\s+([a-f0-9]{64})`, 'i'));
      if (altHashMatch) return altHashMatch[1];
    }

    // Если хеш не найден, пропускаем проверку (не критично)
    return undefined;
  }

  private static async installUpdate(filePath: string): Promise<boolean> {
    try {
      const { spawn } = require('node:child_process');
      const platform = process.platform;

      if (platform === 'win32') {
        // Windows - запускаем exe
        spawn(filePath, [], {
          detached: true,
          stdio: 'ignore',
        });
      } else if (platform === 'darwin') {
        // macOS - монтируем DMG и запускаем установщик
        spawn('open', [filePath], {
          detached: true,
          stdio: 'ignore',
        });
      } else if (platform === 'linux') {
        if (filePath.endsWith('.AppImage')) {
          // AppImage - делаем исполняемым и запускаем
          require('node:fs').chmodSync(filePath, '755');
          spawn(filePath, [], {
            detached: true,
            stdio: 'ignore',
          });
        } else if (filePath.endsWith('.deb')) {
          // DEB пакет - используем dpkg или показываем инструкции
          const translations = Extensions.getTranslations().updater;
          await dialog.showMessageBox({
            type: 'info',
            title: translations.updater_manual_install_title,
            message: translations.updater_manual_install_message.replace('{path}', filePath),
            buttons: ['OK'],
          });
          return false;
        }
      }

      app.quit();
      return true;
    } catch (error) {
      console.error('Failed to start installer:', error);
      return false;
    }
  }

  isNewerThan(other: Version): boolean {
    if (this.major !== other.major) {
      return this.major > other.major;
    }
    if (this.minor !== other.minor) {
      return this.minor > other.minor;
    }
    if (this.build !== other.build) {
      return this.build > other.build;
    }
    return this.revision > other.revision;
  }

  toString(): string {
    const parts = [];
    if (this.major >= 0) parts.push(this.major);
    if (this.minor >= 0) parts.push(this.minor);
    if (this.build >= 0) parts.push(this.build);
    if (this.revision >= 0) parts.push(this.revision);
    return parts.join('.');
  }
}
