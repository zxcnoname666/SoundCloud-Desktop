import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { app, dialog } from 'electron';
import fetch from 'node-fetch';
import { Extensions } from './Extensions.js';

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

  static async checkForUpdates(): Promise<boolean> {
    try {
      const currentVersion = new Version(app.getVersion());
      const updateInfo = await Version.fetchUpdateInfo();

      if (!updateInfo) {
        return false;
      }

      const remoteVersion = new Version(updateInfo.tag_name);

      if (remoteVersion.isNewerThan(currentVersion)) {
        return await Version.showUpdateDialog(updateInfo);
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
        'https://api.github.com/repos/zxcnoname666/SoundCloud-Desktop/releases/latest'
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

  private static async showUpdateDialog(updateInfo: any): Promise<boolean> {
    const translations = Extensions.getTranslations().updater;

    const result = await dialog.showMessageBox({
      type: 'info',
      title: translations.updater_title,
      message: translations.updater_details,
      detail: `${translations.updater_notes}\n${updateInfo.body || 'No release notes available'}`,
      buttons: [translations.updater_install, translations.updater_later],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      return await Version.downloadAndInstallUpdate(updateInfo);
    }

    return false;
  }

  private static async downloadAndInstallUpdate(updateInfo: any): Promise<boolean> {
    try {
      const asset = Version.findAssetForPlatform(updateInfo.assets);

      if (!asset) {
        throw new Error(`No installer found for platform: ${process.platform}`);
      }

      const filePath = await Version.downloadFile(asset.browser_download_url, asset.name);

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

  private static async downloadFile(url: string, filename: string): Promise<string> {
    const filePath = require('node:path').join(require('node:os').tmpdir(), filename);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const fileStream = createWriteStream(filePath);
    await pipeline(response.body!, fileStream);

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
          await dialog.showMessageBox({
            type: 'info',
            title: 'Manual Installation Required',
            message: `Please install manually using: sudo dpkg -i ${filePath}`,
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
