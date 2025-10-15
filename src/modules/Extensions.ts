import { join } from 'node:path';
import { app } from 'electron';
import type { Translation } from '../types/config.js';
import { ConfigManager } from '../utils/config.js';

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
        // Для упакованного приложения - ищем в .asar.unpacked
        join(`${appPath}.unpacked`, 'bins/native_utils.node'),
        // Для обычной сборки
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
    auth: Translation;
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
        auth: Extensions.getAuthTranslations(selectedTranslation || ({} as Translation)),
      };
    } catch (error) {
      console.warn('Failed to load translations, using defaults:', error);
      return {
        proxy: Extensions.getProxyTranslations({} as Translation),
        updater: Extensions.getUpdaterTranslations({} as Translation),
        tasks: Extensions.getTasksTranslations({} as Translation),
        auth: Extensions.getAuthTranslations({} as Translation),
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
      proxy_loaded_count: 'Loaded proxy servers: {count}',
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
      updater_manual_install_title: 'Manual Installation Required',
      updater_manual_install_message: 'Please install manually using: sudo dpkg -i {path}',
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

  private static getAuthTranslations(translation: Translation): Translation {
    const defaults = {
      auth_modal_title: '🎵 SoundCloud Authentication',
      auth_token_title: '🔑 Enter Your Authentication Token',
      auth_token_description:
        'Follow the guide below to extract your SoundCloud authentication token:',
      auth_token_placeholder: 'Paste your oauth_token here...',
      auth_save_button: 'Save Token',
      auth_guide_title: '📋 How to get your SoundCloud token:',
      auth_guide_step1_title: 'Open SoundCloud in your browser',
      auth_guide_step1_desc: "Go to soundcloud.com and make sure you're logged in",
      auth_guide_step2_title: 'Open Developer Tools',
      auth_guide_step2_desc: 'Press F12 or Ctrl+Shift+I (Windows/Linux) or Cmd+Option+I (Mac)',
      auth_guide_step3_title: 'Go to Application/Storage tab',
      auth_guide_step3_desc: 'Click on "Application" tab (Chrome/Edge) or "Storage" tab (Firefox)',
      auth_guide_step4_title: 'Find Cookies',
      auth_guide_step4_desc: 'Expand "Cookies" → "https://soundcloud.com"',
      auth_guide_step5_title: 'Copy oauth_token',
      auth_guide_step5_desc: 'Find cookie named oauth_token and copy its Value',
      auth_guide_step6_title: 'Paste and Save',
      auth_guide_step6_desc: 'Paste the token value above and click "Save Token"',
      auth_guide_warning:
        "⚠️ Important: Your token is like a password - keep it secure and don't share it with others!",
      auth_status_token_invalid:
        'Your authentication token was invalid and has been cleared. Please enter a valid token.',
      auth_status_enter_token: 'Please enter a token',
      auth_status_saving: 'Saving token...',
      auth_status_saved: 'Token saved successfully! 🎉',
      auth_status_failed: 'Failed to save token: {error}',
      auth_status_ipc_unavailable: 'Electron IPC not available',
    };

    return {
      ...defaults,
      ...translation,
    } as Translation;
  }
}
