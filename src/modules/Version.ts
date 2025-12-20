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
        'https://api.github.com/repos/loli669/SoundCloud-Desktop/releases/latest',
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

  private static detectInstallationFormat(): string {
    const platform = process.platform;

    if (platform === 'linux') {
      // Check for Snap
      if (process.env['SNAP'] || process.env['SNAP_NAME']) {
        return 'snap';
      }

      // Check for AppImage
      if (process.env['APPIMAGE']) {
        return 'AppImage';
      }

      // Check for deb installation
      try {
        const { execSync } = require('node:child_process');
        execSync('dpkg -s soundcloud', { stdio: 'ignore' });
        return 'deb';
      } catch {
        // Not installed via deb
      }

      // Check for rpm installation
      try {
        const { execSync } = require('node:child_process');
        execSync('rpm -q soundcloud', { stdio: 'ignore' });
        return 'rpm';
      } catch {
        // Not installed via rpm
      }

      // Default to AppImage for Linux
      return 'AppImage';
    }

    if (platform === 'win32') {
      // Check if running portable version (in temp or user directory)
      const appPath = app.getPath('exe');
      if (appPath.includes('Portable') || !appPath.includes('Program Files')) {
        return 'portable';
      }
      return 'installer';
    }

    if (platform === 'darwin') {
      return 'dmg';
    }

    return 'unknown';
  }

  private static findAssetForPlatform(assets: any[]): any {
    const platform = process.platform;
    const arch = process.arch;
    const format = Version.detectInstallationFormat();

    // Маппинг архитектур Node.js -> имена в файлах
    const archMap: Record<string, string[]> = {
      x64: ['x64', 'amd64', 'x86_64'],
      ia32: ['ia32', 'x86', 'i386'],
      arm64: ['arm64', 'aarch64'],
      arm: ['arm', 'armv7'],
    };

    const archAliases = archMap[arch] || [arch];

    /**
     * Ищет asset по списку паттернов с поддержкой приоритета архитектур
     * @param patterns - Массив паттернов в порядке приоритета
     * @returns Найденный asset или null
     */
    const findAsset = (patterns: RegExp[]): any => {
      for (const pattern of patterns) {
        const asset = assets.find((a: any) => pattern.test(a.name));
        if (asset) return asset;
      }
      return null;
    };

    /**
     * Создаёт паттерны для поиска с учётом архитектуры и фаллбеками
     */
    const createPatternsWithFallback = (
      primaryPatterns: string[],
      fallbackPatterns: string[]
    ): RegExp[] => {
      const patterns: RegExp[] = [];

      // 1. Паттерны с архитектурой (высокий приоритет)
      for (const archAlias of archAliases) {
        for (const pattern of primaryPatterns) {
          patterns.push(new RegExp(pattern.replace('{arch}', archAlias), 'i'));
        }
      }

      // 2. Фаллбек паттерны (без архитектуры или универсальные)
      for (const pattern of fallbackPatterns) {
        patterns.push(new RegExp(pattern, 'i'));
      }

      return patterns;
    };

    let patterns: RegExp[] = [];

    switch (platform) {
      case 'win32':
        if (format === 'portable') {
          patterns = createPatternsWithFallback(
            ['^SoundCloudPortable-{arch}\\.exe$', '-{arch}-win\\.zip$', 'Portable-{arch}\\.exe$'],
            [
              '^SoundCloudPortable\\.exe$', // Универсальный portable
              '-win\\.zip$',
              'Portable.*\\.exe$',
            ]
          );
        } else {
          patterns = createPatternsWithFallback(
            [
              '^SoundCloudInstaller-{arch}\\.exe$',
              '-{arch}-win\\.zip$',
              'Installer-{arch}\\.exe$',
              'Setup-{arch}\\.exe$',
            ],
            [
              '^SoundCloudInstaller\\.exe$', // Универсальный installer
              '-win\\.zip$',
              'Installer.*\\.exe$',
              'Setup.*\\.exe$',
            ]
          );
        }
        break;

      case 'darwin':
        patterns = createPatternsWithFallback(
          [
            '^[Ss]oundcloud-.*-{arch}\\.dmg$',
            '^[Ss]oundcloud-.*-{arch}-mac\\.zip$',
            '-{arch}-darwin\\.dmg$',
            '-{arch}-macos\\.dmg$',
          ],
          [
            '^[Ss]oundcloud\\.dmg$', // SoundCloud.dmg (default from forge)
            '^[Ss]oundcloud-[0-9.]+\\.dmg$', // soundcloud-3.3.0.dmg
            '^[Ss]oundcloud-.*-mac\\.zip$',
            '-mac\\.dmg$',
            '-darwin\\.dmg$',
            '-macos\\.dmg$',
          ]
        );
        break;

      case 'linux': {
        const linuxExtension =
          format === 'snap'
            ? 'snap'
            : format === 'deb'
              ? 'deb'
              : format === 'rpm'
                ? 'rpm'
                : 'AppImage';

        if (linuxExtension === 'AppImage') {
          patterns = createPatternsWithFallback(
            [
              `^[Ss]oundcloud-.*-{arch}\\.${linuxExtension}$`,
              `^[Ss]oundcloud-.*-linux-{arch}\\.${linuxExtension}$`,
              `-{arch}\\.${linuxExtension}$`,
            ],
            [
              `^[Ss]oundcloud.*\\.${linuxExtension}$`,
              `.*-linux.*\\.${linuxExtension}$`,
              `.*\\.${linuxExtension}$`,
            ]
          );
        } else if (linuxExtension === 'deb') {
          // deb files from forge use underscores: soundcloud_3.3.0_amd64.deb
          patterns = createPatternsWithFallback(
            [`^soundcloud[_-].*[_-]{arch}\\.${linuxExtension}$`],
            [`^soundcloud.*\\.${linuxExtension}$`, `.*\\.${linuxExtension}$`]
          );
        } else if (linuxExtension === 'rpm') {
          // rpm files from forge: soundcloud-3.3.0-1.x86_64.rpm
          patterns = createPatternsWithFallback(
            [`^soundcloud-.*[-.]\\d+\\.{arch}\\.${linuxExtension}$`],
            [`^soundcloud.*\\.${linuxExtension}$`, `.*\\.${linuxExtension}$`]
          );
        } else {
          patterns = createPatternsWithFallback(
            [
              `^soundcloud-.*-{arch}\\.${linuxExtension}$`,
              `^soundcloud-.*-linux-{arch}\\.${linuxExtension}$`,
            ],
            [`^soundcloud.*\\.${linuxExtension}$`, `.*\\.${linuxExtension}$`]
          );
        }
        break;
      }
    }

    return findAsset(patterns);
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
      const { spawn, execSync } = require('node:child_process');
      const platform = process.platform;
      const format = Version.detectInstallationFormat();
      const translations = Extensions.getTranslations().updater;

      if (platform === 'win32') {
        const isPortable = format === 'portable';

        if (isPortable) {
          // Portable - показываем инструкцию по замене
          await dialog.showMessageBox({
            type: 'info',
            title: 'Update Downloaded',
            message: `Portable version updated!\n\nUpdate downloaded to:\n${filePath}\n\nPlease close the application and replace the executable manually.`,
            buttons: ['OK'],
          });
          return false;
        }
        // Installer - запускаем установщик
        spawn(filePath, [], {
          detached: true,
          stdio: 'ignore',
        });
        app.quit();
        return true;
      }
      if (platform === 'darwin') {
        // macOS - открываем DMG
        spawn('open', [filePath], {
          detached: true,
          stdio: 'ignore',
        });
        app.quit();
        return true;
      }
      if (platform === 'linux') {
        if (filePath.endsWith('.snap')) {
          // Snap - показываем инструкцию (обновление через snap refresh)
          await dialog.showMessageBox({
            type: 'info',
            title: 'Snap Update Available',
            message:
              'A new version is available!\n\nTo update Snap package, run:\nsudo snap refresh soundcloud\n\nOr visit Snap Store for automatic updates.',
            buttons: ['OK'],
          });
          return false;
        }
        if (filePath.endsWith('.AppImage')) {
          // AppImage - заменяем текущий файл
          const currentAppImage = process.env['APPIMAGE'];

          if (currentAppImage) {
            const fs = require('node:fs');
            const path = require('node:path');
            const os = require('node:os');

            // Делаем новый AppImage исполняемым
            fs.chmodSync(filePath, '755');

            // Создаем временный скрипт для замены
            const tempDir = os.tmpdir();
            const scriptPath = path.join(tempDir, `replace-appimage-${Date.now()}.sh`);

            // Содержимое bash-скрипта
            const scriptContent = `#!/bin/sh
# Ждем завершения текущего процесса
sleep 2

# Заменяем файл
cp -f "${filePath}" "${currentAppImage}"

# Делаем исполняемым
chmod +x "${currentAppImage}"

# Запускаем новую версию
"${currentAppImage}" &

# Удаляем временный скрипт
rm -f "${scriptPath}"
rm -f "${filePath}"`;

            // Сохраняем скрипт
            fs.writeFileSync(scriptPath, scriptContent);
            fs.chmodSync(scriptPath, '755');

            // Запускаем скрипт в фоне
            spawn('sh', [scriptPath], {
              detached: true,
              stdio: 'ignore',
            });

            app.quit();
            return true;
            // biome-ignore lint/style/noUselessElse: усложняет чтение
          } else {
            // Если не можем определить текущий AppImage, запускаем новый
            require('node:fs').chmodSync(filePath, '755');
            spawn(filePath, [], {
              detached: true,
              stdio: 'ignore',
            });
            app.quit();
            return true;
          }
          // biome-ignore lint/style/noUselessElse: усложняет чтение
        } else if (filePath.endsWith('.deb')) {
          // DEB - показываем инструкцию с командой установки
          const fileName = require('node:path').basename(filePath);
          await dialog.showMessageBox({
            type: 'info',
            title: translations.updater_manual_install_title || 'Update Downloaded',
            message: `Update downloaded to:\n${filePath}\n\nTo install, run:\nsudo apt install ./${fileName}\n\nOr double-click the file to install via GUI.`,
            buttons: ['OK'],
          });

          // Пытаемся открыть файл через xdg-open для GUI установки
          try {
            execSync(`xdg-open "${filePath}"`, { stdio: 'ignore' });
          } catch {
            // Игнорируем ошибку, если xdg-open не доступен
          }

          return false;
          // biome-ignore lint/style/noUselessElse: <explanation>
        } else if (filePath.endsWith('.rpm')) {
          // RPM - показываем инструкцию с командой установки
          const fileName = require('node:path').basename(filePath);
          await dialog.showMessageBox({
            type: 'info',
            title: 'Update Downloaded',
            message: `Update downloaded to:\n${filePath}\n\nTo install, run:\nsudo rpm -U ${fileName}\n\nOr for DNF:\nsudo dnf install ${fileName}\n\nOr double-click the file to install via GUI.`,
            buttons: ['OK'],
          });

          // Пытаемся открыть файл через xdg-open для GUI установки
          try {
            execSync(`xdg-open "${filePath}"`, { stdio: 'ignore' });
          } catch {
            // Игнорируем ошибку
          }

          return false;
        }
      }

      return false;
    } catch (error) {
      console.error('Failed to install update:', error);
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
