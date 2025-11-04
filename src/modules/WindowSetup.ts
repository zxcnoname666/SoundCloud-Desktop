import { join } from 'node:path';
import {
  BrowserWindow,
  Menu,
  Tray,
  app,
  globalShortcut,
  nativeImage,
  protocol,
  shell,
} from 'electron';
import fetch from 'node-fetch';
import type { WindowBounds } from '../types/config.js';
import { ProxyManager } from './ProxyManager.js';

export class WindowSetup {
  private static tray: Tray | null = null;
  private static proxyRegistered = false;
  private static proxyInitialized = false;

  static async createMainWindow(): Promise<BrowserWindow> {
    const bounds = WindowSetup.getWindowBounds();

    const window = new BrowserWindow({
      ...bounds,
      minWidth: 800,
      minHeight: 600,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webviewTag: true,
        preload: join(app.getAppPath(), 'frontend/preloads/main.js'),
      },
      icon: join(app.getAppPath(), 'icons/appLogo.png'),
      title: 'SoundCloud Desktop',
      titleBarStyle: 'hidden',
      darkTheme: true,
      //titleBarOverlay: {
      //  color: '#f50',
      //  symbolColor: '#fff',
      //},
      frame: false,
    });

    window.setMenu(null);
    return window;
  }

  static async createLoaderWindow(): Promise<BrowserWindow> {
    const loaderWindow = new BrowserWindow({
      width: 400,
      height: 300,
      show: true,
      resizable: false,
      frame: false,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
      icon: join(app.getAppPath(), 'icons/appLogo.png'),
    });

    await loaderWindow.loadFile(join(app.getAppPath(), 'frontend/loader.html'));

    return loaderWindow;
  }

  static setupTray(window: BrowserWindow): void {
    try {
      const icon = nativeImage.createFromPath(join(app.getAppPath(), 'icons/appLogo.png'));
      WindowSetup.tray = new Tray(icon.resize({ width: 16, height: 16 }));

      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Show App',
          click: () => window.show(),
        },
        {
          label: 'Quit',
          click: () => app.exit(0),
        },
      ]);

      WindowSetup.tray.setContextMenu(contextMenu);
      WindowSetup.tray.setToolTip('SoundCloud Desktop');

      WindowSetup.tray.on('double-click', () => {
        if (window.isVisible()) {
          window.hide();
        } else {
          window.show();
        }
      });
    } catch (error) {
      console.warn('Failed to setup tray:', error);
    }
  }

  static setupCors(windowSession: Electron.Session): void {
    // Адблок - блокируем рекламные запросы
    windowSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
      try {
        const parsedUrl = new URL(details.url);

        // Проверяем адблок
        if (WindowSetup.checkAdBlock(parsedUrl)) {
          callback({ cancel: true });
          return;
        }

        // Блокируем сторонние домены (кроме разрешенных)
        if (
          !parsedUrl.host.endsWith('soundcloud.com') &&
          !parsedUrl.host.endsWith('sndcdn.com') &&
          !parsedUrl.host.endsWith('soundcloud.cloud') &&
          !parsedUrl.host.endsWith('.captcha-delivery.com') &&
          !parsedUrl.host.endsWith('js.datadome.co') &&
          !parsedUrl.host.endsWith('google.com') &&
          !parsedUrl.host.endsWith('gstatic.com') &&
          parsedUrl.host !== 'lh3.googleusercontent.com' &&
          !parsedUrl.host.endsWith('apple.com') &&
          !parsedUrl.host.endsWith('-ssl.mzstatic.com') &&
          parsedUrl.host !== 'soundcloud-upload.s3.amazonaws.com'
        ) {
          callback({ cancel: true });
          return;
        }

        // Блокируем страницу ожидания SoundCloud
        if (
          parsedUrl.host === 'soundcloud.com' &&
          parsedUrl.pathname.startsWith('/n/pages/standby')
        ) {
          callback({ cancel: true });
          return;
        }

        // Редирект на главную при ошибках Chrome
        if (details.url.includes('chrome-error://')) {
          callback({ redirectURL: 'https://soundcloud.com/' });
          return;
        }

        callback({});
      } catch (error) {
        console.warn('Error in onBeforeRequest:', error);
        callback({});
      }
    });

    windowSession.webRequest.onBeforeSendHeaders({ urls: ['*://*/*'] }, (details, callback) => {
      try {
        const headers = { ...details.requestHeaders };

        // Устанавливаем User-Agent для всех запросов
        headers['User-Agent'] =
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';
        headers['sec-ch-ua'] = '"Google Chrome";v="136", "Chromium";v="136", "Not_A Brand";v="24"';

        callback({ requestHeaders: headers });
      } catch (error) {
        console.warn('Error in onBeforeSendHeaders:', error);
        callback({ requestHeaders: details.requestHeaders });
      }
    });
  }

  static hookNewWindow(contents: Electron.WebContents): void {
    contents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('http')) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
      return { action: 'allow' };
    });
  }

  static setupBindings(window: BrowserWindow): void {
    function zoomIn() {
      const focused = BrowserWindow.getFocusedWindow();
      if (focused) {
        const factor = focused.webContents.getZoomFactor();
        focused.webContents.setZoomFactor(factor + 0.1);
      }
    }

    const zoomOut = () => {
      const focused = BrowserWindow.getFocusedWindow();
      if (focused) {
        const factor = focused.webContents.getZoomFactor();
        focused.webContents.setZoomFactor(factor - 0.1);
      }
    };

    const resetZoom = () => {
      const focused = BrowserWindow.getFocusedWindow();
      if (focused) {
        focused.webContents.setZoomFactor(1.0);
      }
    };

    const toggleDevTools = () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        focusedWindow.webContents.toggleDevTools();
      }
    };

    const toggleFullscreen = () => {
      window.setFullScreen(!window.isFullScreen());
    };

    const reload = () => {
      const focused = BrowserWindow.getFocusedWindow();
      if (focused) {
        focused.webContents.reload();
      }
    };

    // Функция для регистрации всех горячих клавиш
    const registerShortcuts = () => {
      globalShortcut.register('CommandOrControl+=', zoomIn);
      globalShortcut.register('CommandOrControl+Shift+=', zoomIn);
      globalShortcut.register('CommandOrControl+-', zoomOut);
      globalShortcut.register('CommandOrControl+0', resetZoom);
      globalShortcut.register('CommandOrControl+Shift+I', toggleDevTools);
      globalShortcut.register('F11', toggleFullscreen);
      globalShortcut.register('CommandOrControl+R', reload);
    };

    // Функция для отмены регистрации всех горячих клавиш
    const unregisterShortcuts = () => {
      globalShortcut.unregister('CommandOrControl+=');
      globalShortcut.unregister('CommandOrControl+Shift+=');
      globalShortcut.unregister('CommandOrControl+-');
      globalShortcut.unregister('CommandOrControl+0');
      globalShortcut.unregister('CommandOrControl+Shift+I');
      globalShortcut.unregister('F11');
      globalShortcut.unregister('CommandOrControl+R');
    };

    // Регистрируем горячие клавиши при инициализации
    registerShortcuts();

    // Отключаем горячие клавиши при потере фокуса окна
    window.on('blur', () => {
      unregisterShortcuts();
    });

    // Отключаем горячие клавиши при сворачивании окна
    window.on('hide', () => {
      unregisterShortcuts();
    });

    // Включаем горячие клавиши при получении фокуса
    window.on('focus', () => {
      registerShortcuts();
    });

    // Включаем горячие клавиши при показе окна
    window.on('show', () => {
      registerShortcuts();
    });

    // Очищаем все горячие клавиши при выходе из приложения
    app.on('will-quit', () => {
      globalShortcut.unregisterAll();
    });
  }

  static async initializeProxyHandler(): Promise<void> {
    if (WindowSetup.proxyInitialized) {
      return;
    }

    console.log('🔄 Initializing proxy handler...');
    WindowSetup.setupProxyHandler();

    // Ждем пока прокси инициализируется и включится
    const maxWaitTime = 10000; // 10 секунд максимум
    const checkInterval = 100; // проверяем каждые 100ms
    let waited = 0;

    while (waited < maxWaitTime) {
      const proxyManager = ProxyManager.getInstance();
      const hasProxy = !!proxyManager.getCurrentProxy();

      if (hasProxy && WindowSetup.proxyRegistered) {
        console.log('✅ Proxy handler initialized and enabled');
        WindowSetup.proxyInitialized = true;
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    // Если прокси не найден, это не критично - продолжаем загрузку
    console.log('⚠️  Proxy not found or failed to initialize, continuing without proxy');
    WindowSetup.proxyInitialized = true;
  }

  private static getWindowBounds(): WindowBounds {
    return {
      width: 1200,
      height: 800,
    };
  }

  private static setupProxyHandler(): void {
    const httpsHandleMethod = async (request: Request): Promise<Response> => {
      return await WindowSetup.getProxyResponse(request);
    };

    // Проверяем каждые 5 секунд, нужно ли включать/выключать прокси
    setInterval(() => {
      const proxyManager = ProxyManager.getInstance();
      const hasProxy = !!proxyManager.getCurrentProxy();

      if (!hasProxy && WindowSetup.proxyRegistered) {
        protocol.unhandle('https');
        WindowSetup.proxyRegistered = false;
        console.log('🚫 Proxy handler disabled');
      } else if (hasProxy && !WindowSetup.proxyRegistered) {
        protocol.handle('https', httpsHandleMethod);
        WindowSetup.proxyRegistered = true;
        console.log('✅ Proxy handler enabled');
      }
    }, 5000);
  }

  public static checkAdBlock(parsedUrl: URL): boolean {
    return (
      parsedUrl.host === 'promoted.soundcloud.com' ||
      parsedUrl.host.endsWith('.adswizz.com') ||
      parsedUrl.host.endsWith('.adsrvr.org') ||
      parsedUrl.host.endsWith('.doubleclick.net') ||
      parsedUrl.href.includes('audio-ads') ||
      parsedUrl.host.endsWith('nr-data.net') // flood
    );
  }

  private static shouldProxyDomain(hostname: string): boolean {
    const proxyDomains = [
      'soundcloud.com',
      'sndcdn.com',
      'api.soundcloud.com',
      'api-v2.soundcloud.com',
    ];

    return proxyDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  }

  private static async getProxyResponse(request: Request): Promise<Response> {
    const proxyManager = ProxyManager.getInstance();

    try {
      // Проверяем, нужно ли проксировать этот домен
      const url = new URL(request.url);
      if (WindowSetup.checkAdBlock(new URL(url))) {
        return new Response(null, { status: 403, statusText: 'Ad Blocker Detected' });
      }
      if (!WindowSetup.shouldProxyDomain(url.hostname)) {
        // Делаем обычный запрос без прокси
        const requestBody = request.body ? Buffer.from(await request.arrayBuffer()) : null;
        const response = await fetch(request.url, {
          method: request.method,
          headers: Object.fromEntries(request.headers.entries()),
          body: requestBody,
        });

        // Конвертируем в web Response
        const responseHeaders = new Headers();
        response.headers.forEach((value: string, key: string) => {
          responseHeaders.set(key, value);
        });

        const bodyBuffer = response.body ? await response.arrayBuffer() : null;
        return new Response(bodyBuffer, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
        });
      }

      const requestBody = request.body ? Buffer.from(await request.arrayBuffer()) : null;
      const response = await proxyManager.sendRequest(request.url, {
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: requestBody,
      });

      // Конвертируем node-fetch Response в web Response
      const responseHeaders = new Headers();
      response.headers.forEach((value: string, key: string) => {
        responseHeaders.set(key, value);
      });

      // Получаем body как ArrayBuffer для создания web Response
      const bodyBuffer = response.body ? await response.arrayBuffer() : null;

      return new Response(bodyBuffer, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      console.warn('Proxy request failed:', request.url, error);
      return new Response('Proxy Error', { status: 500 });
    }
  }
}
