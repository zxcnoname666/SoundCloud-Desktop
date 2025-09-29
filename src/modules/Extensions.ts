import {join} from 'node:path';
import {app} from 'electron';
import type {Translation} from '../types/config.js';
import {ConfigManager} from '../utils/config.js';

interface NativeUtils {
  protocolInject(exePath: string): boolean;
}

export class Extensions {
  private static nativeUtils: NativeUtils | null = null;

  static {
    try {
      // Try different paths for native module
        // Используем app.getAppPath() для работы с ASAR архивом
        const appPath = app.getAppPath();
      const possiblePaths = [
          join(appPath, 'bins/native_utils.node'),
          // Фоллбэк пути для разработки
        '../../bins/native_utils.node',
        '../bins/native_utils.node',
        './bins/native_utils.node',
      ];

      for (const path of possiblePaths) {
        try {
          Extensions.nativeUtils = require(path);
          console.log(`✅ Native utils loaded from: ${path}`);
          break;
        } catch {
          // Continue to next path
        }
      }

      if (!Extensions.nativeUtils) {
        console.warn('⚠️  Native utils module not found - protocol registration will be skipped');
      }
    } catch (error) {
      console.warn('⚠️  Native utils module loading failed:', error);
      Extensions.nativeUtils = null;
    }
  }

  static protocolInject(): boolean {
    if (!Extensions.nativeUtils) {
      console.warn('⚠️  Cannot inject protocol: native utils not available');
      return false;
    }

    try {
      const result = Extensions.nativeUtils.protocolInject(app.getPath('exe'));
      if (result) {
        console.log('✅ Protocol injection successful');
      } else {
        console.warn('⚠️  Protocol injection failed');
      }
      return result;
    } catch (error) {
      console.warn('⚠️  Protocol injection error:', error);
      return false;
    }
  }

  static getTranslations(): {
    proxy: Translation;
    updater: Translation;
    tasks: Translation;
  } {
    try {
      const configManager = ConfigManager.getInstance();
      const config = configManager.getConfig();
      const locale = Extensions.getLocale();
      const isRussian = Extensions.isRussianLocale(locale);

      const selectedTranslation = isRussian
        ? config.translations['ru']
        : (config.translations[locale] ?? config.translations['en']);

      return {
        proxy: Extensions.getProxyTranslations(selectedTranslation || ({} as Translation)),
        updater: Extensions.getUpdaterTranslations(selectedTranslation || ({} as Translation)),
        tasks: Extensions.getTasksTranslations(selectedTranslation || ({} as Translation)),
      };
    } catch (error) {
      console.warn('Failed to load translations, using defaults:', error);
      return {
        proxy: Extensions.getProxyTranslations({} as Translation),
        updater: Extensions.getUpdaterTranslations({} as Translation),
        tasks: Extensions.getTasksTranslations({} as Translation),
      };
    }
  }

  private static getLocale(): string {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  }

  private static isRussianLocale(locale: string): boolean {
    return ['ru', 'kk', 'ky', 'be'].some((lang) => locale.includes(lang));
  }

  private static getProxyTranslations(translation: Translation): Translation {
    const defaults = {
      proxy_available_not_found: 'Available proxy servers not found',
      proxy_work_not_found: 'Working proxy servers not found',
      proxy_connected: 'Connected to proxy servers: [HIDDEN]',
    };

    return {
      ...defaults,
      ...translation,
    } as Translation;
  }

  private static getUpdaterTranslations(translation: Translation): Translation {
    const defaults = {
      updater_title: 'Application Update',
      updater_details:
        'A new version of the app is available. Click on the button below to select your choice.',
      updater_notes: 'Update Notes:',
      updater_install: 'Install',
      updater_later: 'Later',
      updater_installation_error: 'Installation error',
      updater_missing_hash: 'Missing hash',
      updater_missing_hash_message:
        'The hash of the downloaded update differs from the hash specified in the config. Most likely, the traffic was intercepted (or someone forgot to update the hash)',
    };

    return {
      ...defaults,
      ...translation,
    } as Translation;
  }

  private static getTasksTranslations(translation: Translation): Translation {
    const defaults = {
      tasks_quit: 'Quit',
      tasks_quit_desc: 'Close the app',
    };

    return {
      ...defaults,
      ...translation,
    } as Translation;
  }
}
