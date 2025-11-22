import {join} from 'node:path';
import {Readable} from 'node:stream';
import {app, BrowserWindow, globalShortcut, Menu, nativeImage, protocol, shell, Tray,} from 'electron';
import fetch from 'node-fetch';
import type {WindowBounds} from '../types/config.js';
import {AssetCache} from './AssetCache.js';
import {ProxyManager} from './ProxyManager.js';
import {ProxyMetricsCollector} from './ProxyMetricsCollector.js';

interface DomainCheckResult {
  shouldProxy: boolean;
  reason: string;
  timestamp: number;
}

export class WindowSetup {
  private static tray: Tray | null = null;
  private static proxyRegistered = false;
  private static proxyInitialized = false;
  private static domainCheckCache: Map<string, DomainCheckResult> = new Map();
  private static CACHE_TTL = 10 * 60 * 1000; // 10 минут

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
      height: 350,
      show: true,
      resizable: false,
      frame: false,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(app.getAppPath(), 'frontend/preloads/loader.js'),
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

      WindowSetup.tray.on('click', () => {
        if (window.isVisible() && !window.isMinimized()) {
          window.hide();
        } else {
          if (window.isMinimized()) {
            window.restore();
          }
          window.show();
          window.focus();
        }
      });
    } catch (error) {
      console.debug('⚠️ Failed to setup tray:', error);
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
        console.debug('⚠️ Error in onBeforeRequest:', error);
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
        console.debug('⚠️ Error in onBeforeSendHeaders:', error);
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

    console.info('🔄 Initializing proxy handler...');
    WindowSetup.setupProxyHandler();

    // Инициализируем сборщик метрик (только в dev режиме)
    await ProxyMetricsCollector.initialize();

    // Инициализируем кэш ассетов
    await AssetCache.initialize();

    // Ждем пока прокси инициализируется и включится
    const maxWaitTime = 10000; // 10 секунд максимум
    const checkInterval = 100; // проверяем каждые 100ms
    let waited = 0;

    while (waited < maxWaitTime) {
      const proxyManager = ProxyManager.getInstance();
      const hasProxy = !!proxyManager.getCurrentProxy();

      if (hasProxy && WindowSetup.proxyRegistered) {
        console.info('✅ Proxy handler initialized and enabled');
        WindowSetup.proxyInitialized = true;
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    // Если прокси не найден, это не критично - продолжаем загрузку
    console.warn('⚠️ Proxy not found or failed to initialize, continuing without proxy');
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
        console.info('🚫 Proxy handler disabled');
      } else if (hasProxy && !WindowSetup.proxyRegistered) {
        protocol.handle('https', httpsHandleMethod);
        WindowSetup.proxyRegistered = true;
        console.info('✅ Proxy handler enabled');
      }
    }, 5000);
  }

  public static checkAdBlock(parsedUrl: URL): boolean {
    const host = parsedUrl.host;

    return (
      // Existing blocks
      host === 'promoted.soundcloud.com' ||
      host.endsWith('.adswizz.com') ||
      host.endsWith('.adsrvr.org') ||
      host.endsWith('.doubleclick.net') ||
      parsedUrl.href.includes('audio-ads') ||
      host.endsWith('nr-data.net') ||
      // Google Tracking
      host === 'www.googletagmanager.com' ||
      host === 'analytics.google.com' ||
      host === 'www.google-analytics.com' ||
      // Quantcast
      host === 'pixel.quantserve.com' ||
      host === 'secure.quantserve.com' ||
      host === 'rules.quantcount.com' ||
      // Amazon Ads
      host === 'c.amazon-adsystem.com' ||
      host === 'config.aps.amazon-adsystem.com' ||
      // Taboola
      host === 'trc.taboola.com' ||
      host === 'cdn.taboola.com' ||
      host === 'psb.taboola.com' ||
      host === 'pips.taboola.com' ||
      host === 'cds.taboola.com' ||
      // Aditude
      host === 'raven-edge.aditude.io' ||
      host === 'edge.aditude.io' ||
      host === 'geo.aditude.io' ||
      host === 'raven-static.aditude.io' ||
      host === 'event-ingestor.judy.pnap.aditude.cloud' ||
      // Social Media Tracking
      host === 'www.facebook.com' ||
      host === 'connect.facebook.net' ||
      host === 'pixel-config.reddit.com' ||
      host === 'alb.reddit.com' ||
      host === 'www.redditstatic.com' ||
      // Tracking Platforms
      host === 'sb.scorecardresearch.com' ||
      host === 'cadmus.script.ac' ||
      host === 'ams-pageview-public.s3.amazonaws.com' ||
      // Marketing Automation
      host === 'sdk-04.moengage.com' ||
      host === 'cdn.moengage.com' ||
      host === 'wa.appsflyer.com' ||
      host === 'websdk.appsflyer.com' ||
      // Programmatic/RTB/Header Bidding
      host === 'geo-location.prebid.cloud' ||
      host === 'gum.criteo.com' ||
      host === 'id5-sync.com' ||
      host === 'lb.eu-1-id5-sync.com' ||
      host === 'htlbid.com' ||
      host === 'ups.analytics.yahoo.com' ||
      // Suspicious domains
      host === 'prodregistryv2.org' ||
      host === 'beyondwickedmapping.org' ||
      // Cookie Consent banners
      host === 'cdn.cookielaw.org'
    );
  }

  /**
   * Проверяет, соответствует ли домен маскам для проксирования
   * Маски: *soundcloud*, *sndcdn*, *snd*, *s-n-d*
   */
  private static matchesDomainMask(hostname: string): boolean {
    const normalizedHost = hostname.toLowerCase();

    // Проверяем основные маски
    const patterns = ['soundcloud', 'sndcdn', 'snd', 's-n-d'];

    return patterns.some((pattern) => normalizedHost.includes(pattern));
  }

  /**
   * Интерактивная проверка доступности домена
   * Детектирует:
   * 1. Блокировки РКН с "удержанием соединения" после начала загрузки
   * 2. Обрыв TCP соединения без error code
   * 3. Обычные ошибки подключения
   */
  private static async checkDomainAccessibility(hostname: string): Promise<DomainCheckResult> {
    const testUrl = `https://${hostname}/`;
    const INITIAL_TIMEOUT = 3000; // 3 секунды на начало ответа
    const HANGING_TIMEOUT = 8000; // 8 секунд на детекцию зависания
    const MIN_BYTES_THRESHOLD = 25 * 1024; // 25КБ - больше чем 19КБ блокировка РКН

    try {
      console.debug(`🔍 Checking domain accessibility: ${hostname}`);

      // Создаем контроллер для абортирования запроса
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), INITIAL_TIMEOUT);

      let responseStarted = false;

      try {
        const response = await fetch(testUrl, {
          method: 'HEAD',
          signal: controller.signal,
          // Отключаем следование за редиректами для более быстрой проверки
          redirect: 'manual',
        });

        clearTimeout(timeoutId);
        responseStarted = true;

        // Если получили ответ - проверяем на зависание при GET запросе
        const statusClass = Math.floor(response.status / 100);

        if (
          statusClass === 2 || // 2xx (включая response.ok)
          statusClass === 3 || // 3xx (редиректы)
          (statusClass === 4 && response.status !== 403 && response.status !== 451) // 4xx, кроме запрещённых
        ) {
          // Делаем GET запрос для проверки зависания с ограничением размера
          let hangingDetected = false;
          const getController = new AbortController();
          const hangingTimeoutId = setTimeout(() => {
            hangingDetected = true;
            getController.abort();
          }, HANGING_TIMEOUT);

          try {
            const getResponse = await fetch(testUrl, {
              signal: getController.signal,
              redirect: 'manual',
            });

            clearTimeout(hangingTimeoutId);

            // Пытаемся прочитать начало данных (используем Node.js stream API)
            if (getResponse.body) {
              let bytesReceived = 0;
              const stream = getResponse.body as any; // node-fetch возвращает Node.js Readable

              const streamReadPromise = new Promise<void>((resolve, reject) => {
                const readTimeout = setTimeout(() => {
                  hangingDetected = true;
                  stream.destroy();
                  reject(new Error('Stream read timeout'));
                }, HANGING_TIMEOUT);

                stream.on('data', (chunk: any) => {
                  const chunkSize = chunk.length || Buffer.byteLength(chunk);
                  bytesReceived += chunkSize;

                  if (bytesReceived >= MIN_BYTES_THRESHOLD) {
                    clearTimeout(readTimeout);
                    stream.destroy();
                    resolve();
                  }
                });

                stream.on('end', () => {
                  clearTimeout(readTimeout);

                  // Если получили меньше MIN_BYTES_THRESHOLD - недостаточно данных для проверки
                  // Просто не можем проверить
                  if (bytesReceived < MIN_BYTES_THRESHOLD) {
                    reject(
                      new Error(
                        `INSUFFICIENT_DATA: ${bytesReceived} bytes < ${MIN_BYTES_THRESHOLD} bytes`
                      )
                    );
                  } else {
                    resolve();
                  }
                });

                stream.on('error', (err: any) => {
                  clearTimeout(readTimeout);
                  reject(err);
                });
              });

              try {
                await streamReadPromise;

                if (hangingDetected) {
                  console.debug(`⚠️ Connection hanging detected for ${hostname}`);
                  return {
                    shouldProxy: true,
                    reason: 'RKN blocking: connection hanging',
                    timestamp: Date.now(),
                  };
                }
              } catch (streamError: any) {
                // Проверяем, зависло ли соединение
                if (hangingDetected) {
                  console.debug(`⚠️ Connection hanging detected for ${hostname}`);
                  return {
                    shouldProxy: true,
                    reason: 'RKN blocking: connection hanging',
                    timestamp: Date.now(),
                  };
                }

                // Обработка других ошибок чтения
                const errorMessage = streamError.message || String(streamError);

                // Недостаточно данных для проверки - НЕ проксируем, НЕ кэшируем
                if (errorMessage.includes('INSUFFICIENT_DATA')) {
                  console.debug(`⚠️ Insufficient data for ${hostname}: ${errorMessage}`);
                  return {
                    shouldProxy: false,
                    reason: 'check incomplete - insufficient data',
                    timestamp: 0, // НЕ кэшируем - timestamp = 0
                  };
                }

                if (
                  errorMessage.includes('ECONNRESET') ||
                  errorMessage.includes('socket hang up') ||
                  errorMessage.includes('Connection closed')
                ) {
                  console.debug(`⚠️ Stream error for ${hostname}: ${errorMessage}`);
                  return {
                    shouldProxy: true,
                    reason: `Stream error: ${errorMessage}`,
                    timestamp: Date.now(),
                  };
                }
              }
            }

            if (hangingDetected) {
              console.debug(`⚠️ Connection hanging detected for ${hostname}`);
              return {
                shouldProxy: true,
                reason: 'RKN blocking: connection hanging',
                timestamp: Date.now(),
              };
            }
          } catch {
            clearTimeout(hangingTimeoutId);

            // Проверяем на абортирование из-за зависания
            if (hangingDetected) {
              console.debug(`⚠️ Connection hanging detected for ${hostname}`);
              return {
                shouldProxy: true,
                reason: 'RKN blocking: connection hanging',
                timestamp: Date.now(),
              };
            }
          }

          // Если всё прошло успешно - прокси не нужен
          console.debug(`✅ Domain ${hostname} is accessible without proxy`);
          return {
            shouldProxy: false,
            reason: 'Direct connection works',
            timestamp: Date.now(),
          };
        }

        // Неожиданный статус код - возможно блокировка
        console.debug(`⚠️ Unexpected status ${response.status} for ${hostname}`);
        return {
          shouldProxy: true,
          reason: `Unexpected status: ${response.status}`,
          timestamp: Date.now(),
        };
      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        // Проверяем тип ошибки
        if (fetchError.name === 'AbortError') {
          if (!responseStarted) {
            // Таймаут на начало соединения
            console.debug(`⚠️ Connection timeout for ${hostname}`);
            return {
              shouldProxy: true,
              reason: 'Connection timeout',
              timestamp: Date.now(),
            };
          }
        }

        // Обрыв TCP соединения или другая сетевая ошибка
        const errorMessage = fetchError.message || String(fetchError);

        // Детектируем обрыв TCP без кода ошибки
        if (
          errorMessage.includes('ECONNRESET') ||
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('socket hang up') ||
          errorMessage.includes('Connection closed') ||
          !fetchError.code // Нет кода ошибки - возможно обрыв TCP
        ) {
          console.debug(`⚠️ TCP connection broken for ${hostname}: ${errorMessage}`);
          return {
            shouldProxy: true,
            reason: `TCP connection broken: ${errorMessage}`,
            timestamp: Date.now(),
          };
        }

        // Другие сетевые ошибки
        console.debug(`⚠️ Network error for ${hostname}: ${errorMessage}`);
        return {
          shouldProxy: true,
          reason: `Network error: ${errorMessage}`,
          timestamp: Date.now(),
        };
      }
    } catch (error: any) {
      // Критическая ошибка - лучше проксировать
      console.error(`❌ Critical error checking ${hostname}: ${error}`);
      return {
        shouldProxy: true,
        reason: `Critical error: ${error.message || String(error)}`,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Проверяет, нужно ли проксировать домен (с интерактивной проверкой)
   *
   * Критерии проксирования (ЛИБО):
   * 1. ЛИБО домен соответствует маскам: *soundcloud*, *sndcdn*, *snd*, *s-n-d*
   * 2. ЛИБО блокировка РКН с "удержанием соединения" после начала загрузки
   * 3. ЛИБО обрыв TCP соединения без error code
   */
  private static async shouldProxyDomain(
    hostname: string
  ): Promise<{ shouldProxy: boolean; reason: string }> {
    console.debug('shouldProxyDomain.hostname', hostname);

    // Если домен соответствует маскам - сразу проксируем
    if (WindowSetup.matchesDomainMask(hostname)) {
      console.debug(`Domain ${hostname} matches proxy masks - proxying`);
      return { shouldProxy: true, reason: 'matches mask' };
    }

    // Проверяем кэш для доменов не из маски
    const cached = WindowSetup.domainCheckCache.get(hostname);
    if (cached && Date.now() - cached.timestamp < WindowSetup.CACHE_TTL) {
      console.debug(
        `Using cached result for ${hostname}: ${cached.shouldProxy} (${cached.reason})`
      );
      return { shouldProxy: cached.shouldProxy, reason: cached.reason };
    }

    // Выполняем интерактивную проверку на блокировку для любого домена
    const result = await WindowSetup.checkDomainAccessibility(hostname);

    // Сохраняем в кэш только если проверка была полной (timestamp > 0)
    if (result.timestamp > 0) {
      WindowSetup.domainCheckCache.set(hostname, result);
    }

    console.debug(`🔍 Domain ${hostname} check result: ${result.shouldProxy} (${result.reason})`);
    return { shouldProxy: result.shouldProxy, reason: result.reason };
  }

  private static async getProxyResponse(request: Request): Promise<Response> {
    const proxyManager = ProxyManager.getInstance();
    const metricsCollector = ProxyMetricsCollector.getInstance();
    const assetCache = AssetCache.getInstance();

    try {
      const url = new URL(request.url);

      // Проверяем adblock и записываем метрику
      if (WindowSetup.checkAdBlock(url)) {
        metricsCollector.recordDomainUsage(url.hostname, false, 'blocked by adblock');
        return new Response(null, { status: 403, statusText: 'Ad Blocker Detected' });
      }

      // Проверяем кэш для статических ассетов
      const cached = await assetCache.get(request.url);
      if (cached) {
        const responseHeaders = new Headers();
        for (const [key, value] of Object.entries(cached.headers)) {
          responseHeaders.set(key, value);
        }

        return new Response(cached.buffer, {
          status: cached.status,
          statusText: cached.statusText,
          headers: responseHeaders,
        });
      }

      const { shouldProxy, reason } = await WindowSetup.shouldProxyDomain(url.hostname);

      // Записываем метрику использования домена
      metricsCollector.recordDomainUsage(url.hostname, shouldProxy, reason);

      if (!shouldProxy) {
        // Делаем обычный запрос без прокси
        const requestBody = request.body ? Buffer.from(await request.arrayBuffer()) : null;
        const response = await fetch(request.url, {
          method: request.method,
          headers: Object.fromEntries(request.headers.entries()),
          body: requestBody,
        });

          return WindowSetup.createStreamingResponseWithCache(response, response.url, assetCache);
      }

      const requestBody = request.body ? Buffer.from(await request.arrayBuffer()) : null;
      const response = await proxyManager.sendRequest(request.url, {
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: requestBody,
      });

        return WindowSetup.createStreamingResponseWithCache(response, response.url, assetCache);
    } catch (error) {
      console.error('❌ Proxy request failed:', request.url, error);
      return new Response('Proxy Error', { status: 500 });
    }
  }

  /**
   * Создает streaming Response с одновременным кэшированием
   * Использует wrapper stream с idle timeout для детекции зависания
   */
  private static createStreamingResponseWithCache(
    nodeFetchResponse: any,
    url: string,
    assetCache: AssetCache
  ): Response {
    // Собираем заголовки
    const headersObj: Record<string, string> = {};
    nodeFetchResponse.headers.forEach((value: string, key: string) => {
      headersObj[key] = value;
    });

    const responseHeaders = new Headers();
    for (const [key, value] of Object.entries(headersObj)) {
      responseHeaders.set(key, value);
    }

    // Если нет body - возвращаем пустой ответ
    if (!nodeFetchResponse.body) {
      return new Response(null, {
        status: nodeFetchResponse.status,
        statusText: nodeFetchResponse.statusText,
        headers: responseHeaders,
      });
    }

    // Конвертируем Node.js Readable в Web ReadableStream
    const webStream = Readable.toWeb(nodeFetchResponse.body) as ReadableStream;

    // Создаём wrapper stream с idle timeout и одновременным кэшированием
    const { wrappedStream, chunksPromise } = WindowSetup.createStreamWithIdleTimeout(
      webStream,
      url
    );

    // Асинхронно кэшируем после завершения потока
    if (nodeFetchResponse.ok) {
      WindowSetup.cacheCollectedChunks(
        chunksPromise,
        url,
        headersObj,
        nodeFetchResponse.status,
        nodeFetchResponse.statusText,
        assetCache
      );
    }

    // Возвращаем wrapped stream клиенту
    return new Response(wrappedStream, {
      status: nodeFetchResponse.status,
      statusText: nodeFetchResponse.statusText,
      headers: responseHeaders,
    });
  }

  /**
   * Создаёт wrapper stream с idle timeout
   * Возвращает wrapped stream для клиента и promise с собранными chunks для кэша
   */
  private static createStreamWithIdleTimeout(
    originalStream: ReadableStream,
    url: string
  ): { wrappedStream: ReadableStream; chunksPromise: Promise<Uint8Array[] | null> } {
    const IDLE_TIMEOUT = 10000; // 10 секунд без данных
    const chunks: Uint8Array[] = [];
    let idleTimer: NodeJS.Timeout | null = null;
    let aborted = false;

    let resolveChunks: (chunks: Uint8Array[] | null) => void;
    const chunksPromise = new Promise<Uint8Array[] | null>((resolve) => {
      resolveChunks = resolve;
    });

    const wrappedStream = new TransformStream({
      async start(controller) {
        const reader = originalStream.getReader();

        const resetIdleTimer = () => {
          if (idleTimer) clearTimeout(idleTimer);
          idleTimer = setTimeout(() => {
            console.warn(`⏰ Idle timeout detected for ${url}`);
            aborted = true;
            reader.cancel('Idle timeout');
            controller.error(new Error('Idle timeout'));
            resolveChunks(null); // Не кэшируем при timeout
          }, IDLE_TIMEOUT);
        };

        resetIdleTimer();

        try {
          while (!aborted) {
            const { done, value } = await reader.read();

            if (done) {
              if (idleTimer) clearTimeout(idleTimer);
              controller.terminate();
              resolveChunks(chunks); // Успешно завершено - отдаём chunks
              break;
            }

            // Получили данные - сбрасываем таймер
            resetIdleTimer();

            // ВАЖНО: Проверяем aborted после resetIdleTimer
            // (timeout мог сработать пока мы ждали reader.read())
            if (aborted) {
              break;
            }

            // Отправляем клиенту
            controller.enqueue(value);

            // Собираем для кэша
            chunks.push(value);
          }
        } catch (error) {
          if (idleTimer) clearTimeout(idleTimer);
          console.error(`❌ Stream error for ${url}:`, error);
          controller.error(error);
          resolveChunks(null); // При ошибке не кэшируем
        }
      },
    });

    return { wrappedStream: wrappedStream.readable, chunksPromise };
  }

  /**
   * Кэширует собранные chunks после завершения потока
   */
  private static async cacheCollectedChunks(
    chunksPromise: Promise<Uint8Array[] | null>,
    url: string,
    headers: Record<string, string>,
    status: number,
    statusText: string,
    assetCache: AssetCache
  ): Promise<void> {
    try {
      const chunks = await chunksPromise;

      // Если null - поток был прерван, не кэшируем
      if (chunks === null) {
        console.debug(`⏭️ Skipping cache for ${url} - stream was aborted`);
        return;
      }

      // Собираем все chunks в один Buffer
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const buffer = Buffer.concat(
        chunks.map((chunk) => Buffer.from(chunk)),
        totalLength
      );

      // Сохраняем в кэш
      await assetCache.set(url, buffer, headers, status, statusText);
      console.info(`📦 Successfully cached ${url} (${totalLength} bytes)`);
    } catch (error) {
      console.error(`❌ Failed to cache ${url}:`, error);
    }
  }
}
