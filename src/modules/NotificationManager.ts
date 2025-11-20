import { join } from 'node:path';
import { type BrowserWindow, Notification, app } from 'electron';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  silent?: boolean;
  urgency?: 'normal' | 'critical' | 'low';
  timeoutType?: 'default' | 'never';
}

export class NotificationManager {
  private static instance: NotificationManager;
  private readonly defaultIcon: string;
  private window: BrowserWindow | null = null;

  private constructor() {
    this.defaultIcon = join(app.getAppPath(), 'icons/appLogo.png');
  }

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  setWindow(window: BrowserWindow): void {
    this.window = window;
  }

  // Метод для проверки разрешений (на некоторых системах)
  static async requestPermission(): Promise<boolean> {
    try {
      return Notification.isSupported();
    } catch (error) {
      console.warn('⚠️ Failed to check notification permissions:', error);
      return false;
    }
  }

  showNotification(options: NotificationOptions): void {
    try {
      // Проверяем поддержку уведомлений
      if (!Notification.isSupported()) {
        console.warn('⚠️ System notifications are not supported');
        return;
      }

      // Создаем уведомление
      const notification = new Notification({
        title: options.title,
        body: options.body,
        icon: options.icon || this.defaultIcon,
        silent: options.silent || false,
        urgency: options.urgency || 'normal',
        timeoutType: options.timeoutType || 'default',
      });

      // Обработчики событий
      notification.on('click', () => {
        console.debug('🔔 Notification clicked');
        // Показываем окно приложения
        if (this.window) {
          if (this.window.isMinimized()) {
            this.window.restore();
          }
          this.window.show();
          this.window.focus();
        }
      });

      notification.on('close', () => {
        console.debug('🔕 Notification closed');
      });

      notification.on('show', () => {
        console.debug('🔔 Notification shown');
      });

      // Показываем уведомление
      notification.show();
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  showProxyNotification(message: string): void {
    this.showNotification({
      title: 'SoundCloud Proxy',
      body: message,
      urgency: 'normal',
    });
  }

  showUpdateNotification(title: string, message: string): void {
    this.showNotification({
      title,
      body: message,
      urgency: 'critical',
    });
  }

  showErrorNotification(title: string, message: string): void {
    this.showNotification({
      title,
      body: message,
      urgency: 'critical',
    });
  }
}
