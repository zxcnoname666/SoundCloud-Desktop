import { join } from 'node:path';
import { BrowserWindow, app } from 'electron';
import { Client } from 'qurre-socket';
import { AppManager } from './modules/AppManager.js';
import { AuthManager } from './modules/AuthManager.js';
import { DiscordAuthManager } from './modules/DiscordAuthManager.js';
import { registerDiscordIPCHandlers } from './modules/DiscordIPCHandlers.js';
import { Extensions } from './modules/Extensions.js';
import { NotificationManager } from './modules/NotificationManager.js';
import { ProxyManager } from './modules/ProxyManager.js';
import { TCPPortChecker } from './modules/TCPPortChecker.js';
import { WindowSetup } from './modules/WindowSetup.js';
import type { AppContext } from './types/global.js';
import { ConfigManager } from './utils/config.js';

class SoundCloudApp {
  private context: AppContext;
  private appManager: AppManager;
  private notifyManager!: NotificationManager; // Initialized in initialize()
  private discordManager!: DiscordAuthManager; // Initialized in initialize()

  constructor() {
    // Отключаем TLS 1.3 ДО инициализации app (критично!)
    app.commandLine.appendSwitch('--tls-version-max', '1.2');
    app.commandLine.appendSwitch('--ssl-version-max', 'tls1.2');
    app.commandLine.appendSwitch('--tls-version-min', '1.0');
    app.commandLine.appendSwitch('--ssl-version-min', 'tls1');

    this.context = {
      isDev: process.env['NODE_ENV'] === 'development' || process.argv.includes('--dev'),
      port: 0, // Will be set after initialization
    };

    this.context.port = this.context.isDev ? 3535 : 45828;
    this.appManager = new AppManager();

    // Setup global error handlers to prevent crashes from unhandled promise rejections
    this.setupGlobalErrorHandlers();

    this.initializeConfig();
  }

  /**
   * Setup global error handlers to gracefully handle unexpected errors
   * This prevents the application from crashing on unhandled promise rejections
   */
  private setupGlobalErrorHandlers(): void {
    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
      console.error('Unhandled Promise Rejection:', reason);
      console.error('Promise:', promise);

      // Log stack trace if available
      if (reason instanceof Error && reason.stack) {
        console.error('Stack trace:', reason.stack);
      }

      // Don't exit - just log the error and continue
      // This is important for non-critical errors like Discord connection failures
    });

    process.on('uncaughtException', (error: Error) => {
      console.error('Uncaught Exception:', error);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }

      // For uncaught exceptions, we may need to exit depending on severity
      // But log it first
    });
  }

  async initialize(): Promise<void> {
    // Проверяем что мы в Electron среде
    if (!app || typeof app.whenReady !== 'function') {
      console.error('❌ This application must be run in Electron environment');
      process.exit(1);
    }

    await app.whenReady();

    // Инициализируем NotificationManager после того как Electron готов
    this.notifyManager = NotificationManager.getInstance();

    // Инициализируем AuthManager для работы с аутентификацией SoundCloud
    const authManager = AuthManager.getInstance();
    authManager.initialize();

    this.discordManager = DiscordAuthManager.getInstance();

    registerDiscordIPCHandlers();

    this.setupAppEvents();
    await this.startup();
  }

  private initializeConfig(): void {
    try {
      const configManager = ConfigManager.getInstance();
      configManager.loadConfig();
    } catch (error) {
      console.warn('⚠️  Failed to load configuration:', error);
      // Continue with defaults
    }
  }

  private setupAppEvents(): void {
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('web-contents-created', (_ev, contents) => {
      this.handleWebContentsCreated(contents);
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.startup().catch(console.error);
      }
    });

    app.on('before-quit', async () => {
      if (this.discordManager) {
        await this.discordManager.disconnect();
      }
    });
  }

  private handleWebContentsCreated(contents: Electron.WebContents): void {
    WindowSetup.hookNewWindow(contents);
    WindowSetup.setupCors(contents.session);

    // Логируем создание webview для отладки
    if (contents.getType() === 'webview') {
    }

    if (this.context.isDev) {
      contents.openDevTools({ mode: 'detach' });
    }
  }

  private async checkPortUsage(): Promise<boolean> {
    const portInUse = await TCPPortChecker.isPortInUse(this.context.port, '127.0.0.1');

    if (!portInUse) {
      return false;
    }

    setTimeout(() => app.quit(), 1000);

    const client = new Client(this.context.port);
    client.emit('OpenApp');

    const url = this.appManager.getStartArgsUrl();
    if (url.length > 1) {
      client.emit('SetUrl', url);
    }

    if (this.appManager.getCloseAll()) {
      client.emit('CloseAll');
    }

    return true;
  }

  private configureDNS(): void {
    app.configureHostResolver({
      secureDnsMode: 'secure',
      secureDnsServers: [
        'https://dns.quad9.net/dns-query',
        'https://dns9.quad9.net/dns-query',
        'https://cloudflare-dns.com/dns-query',
      ],
    });
  }

  private async startup(): Promise<void> {
    try {
      if (await this.checkPortUsage()) {
        return;
      }

      if (this.appManager.getCloseAll()) {
        setTimeout(() => app.quit(), 1000);
        return;
      }

      this.configureDNS();

      const loaderWindow = await WindowSetup.createLoaderWindow();

      await this.appManager.performAutoUpdate(loaderWindow);

      // Инициализируем прокси в самом начале создания окна
      await ProxyManager.initialize(this.notifyManager);

      // Ждем полной инициализации прокси и включения обработчика
      await WindowSetup.initializeProxyHandler();

      this.appManager.setupTasks();
      Extensions.protocolInject();

      const mainWindow = await WindowSetup.createMainWindow();
      this.context.window = mainWindow;

      // Устанавливаем окно для NotificationManager
      this.notifyManager.setWindow(mainWindow);

      this.setupMainWindow(mainWindow, loaderWindow);

      // Загружаем сохраненный токен после создания окна
      const authManager = AuthManager.getInstance();
      await authManager.initializeWithWindow();

      await this.discordManager.initialize(mainWindow);

      if (await this.checkPortUsage()) {
        return;
      }

      await this.appManager.startServer(this.context.port, mainWindow);
      await this.loadMainContent(mainWindow);
    } catch (error) {
      console.error('Startup failed:', error);
      app.quit();
    }
  }

  private setupMainWindow(mainWindow: BrowserWindow, loaderWindow?: BrowserWindow): void {
    mainWindow.once('ready-to-show', () => {
      setTimeout(() => {
        mainWindow.show();
        try {
          loaderWindow?.close();
        } catch (error) {
          console.warn('Failed to close loader window:', error);
        }
      }, 1000);
    });

    mainWindow.on('close', (e) => {
      e.preventDefault();
      mainWindow.hide();
    });

    WindowSetup.setupTray(mainWindow);
    WindowSetup.setupCors(mainWindow.webContents.session);
    WindowSetup.setupBindings(mainWindow);
  }

  private async loadMainContent(mainWindow: BrowserWindow): Promise<void> {
    await mainWindow.loadFile(join(app.getAppPath(), 'frontend/main.html'));
    const startUrl = await this.appManager.getStartUrl();
    mainWindow.webContents.send('webview:navigate', startUrl);
  }
}

const soundCloudApp = new SoundCloudApp();
soundCloudApp.initialize().catch((error) => {
  console.error('Failed to initialize app:', error);
  process.exit(1);
});
