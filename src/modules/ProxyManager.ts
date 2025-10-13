import {URL} from 'node:url';
import fetch from 'node-fetch';
import type {ProxyManagerInterface} from '../types/global.js';
import {ConfigManager} from '../utils/config.js';
import {Extensions} from './Extensions.js';
import type {NotificationManager} from './NotificationManager.js';
import {WindowSetup} from './WindowSetup';

interface ProxyInfo {
  source: string;
  domain: string;
  path?: string;
  headers?: Record<string, string>;
}

export class ProxyManager implements ProxyManagerInterface {
  private static instance: ProxyManager;
  private proxies: ProxyInfo[] = [];
  private notifyManager: NotificationManager | null = null;

  private constructor() {}

  static getInstance(): ProxyManager {
    if (!ProxyManager.instance) {
      ProxyManager.instance = new ProxyManager();
    }
    return ProxyManager.instance;
  }

  static async initialize(notifyManager: NotificationManager): Promise<void> {
    const instance = ProxyManager.getInstance();
    instance.notifyManager = notifyManager;
    await instance.init();
  }

  async init(): Promise<void> {
    try {
      const configManager = ConfigManager.getInstance();
        const proxyConfig = configManager.loadProxyConfig();

      this.proxies = this.parseProxies(proxyConfig.proxy || []);

        if (this.proxies.length === 0) {
            this.showNotification('proxy_available_not_found');
        } else {
            console.log(`Loaded ${this.proxies.length} proxies`);
            this.showNotification('proxy_connected', `${this.proxies.length} proxies loaded`);
        }
    } catch (error) {
      console.warn('Failed to initialize proxy manager:', error);
    }
  }

  getCurrentProxy(): string | null {
      return this.proxies[0]?.source || null;
  }

  async sendRequest(url: string, options: any = {}, useProxy = true): Promise<any> {
    if (WindowSetup.checkAdBlock(new URL(url))) {
      return new Response(null, { status: 403, statusText: 'Ad Blocker Detected' });
    }

      if (!useProxy || this.proxies.length === 0) {
      return fetch(url, options);
    }

      // Всегда пробуем прокси с первого по списку
    const method = options.method || 'GET';
    const headers = options.headers || {};
      let lastError: string | null = null;

      for (const proxy of this.proxies) {
          try {
              const proxyUrl = this.buildProxyUrl(proxy);

              const proxyOptions: any = {
                  method: method,
                  signal: AbortSignal.timeout(15000),
                  headers: {
                      ...proxy.headers,
                      ...headers,
                      'X-Proxy-Target-URL': url,
                  },
              };

              if (options.body) {
                  proxyOptions.body = options.body;
              }

              const response = await fetch(proxyUrl, proxyOptions);

              // Проверяем успешность ответа
              if (!response.ok) {
                  console.warn(`Proxy ${proxy.domain} returned ${response.status}: ${response.statusText}`);
                  lastError = `${response.status} ${response.statusText}`;
                  continue;
              }

              return response;
          } catch (error) {
              console.warn(`Proxy ${proxy.domain} failed:`, error);
              lastError = error instanceof Error ? error.message : String(error);
              // Пробуем следующий прокси
          }
      }

      // Если все прокси не работают, пробуем без прокси
      console.warn('All proxies failed, trying direct connection');
      try {
          return await fetch(url, options);
      } catch (directError) {
          throw new Error(
              `All proxies failed and direct connection failed. Last proxy error: ${lastError || 'Unknown'}. Direct error: ${directError}`
          );
      }
  }

  private parseProxies(proxyStrings: string[]): ProxyInfo[] {
    return proxyStrings
      .map((proxyString) => {
        try {
          const url = new URL(proxyString);
          return {
            source: proxyString,
            domain: `${url.protocol}//${url.host}`,
            path: url.pathname !== '/' ? url.pathname : undefined,
            headers: url.searchParams.has('headers')
              ? JSON.parse(decodeURIComponent(url.searchParams.get('headers')!))
              : undefined,
          };
        } catch (error) {
          console.warn(`Failed to parse proxy: ${proxyString}`, error);
          return null;
        }
      })
      .filter(Boolean) as ProxyInfo[];
  }

  private buildProxyUrl(proxy: ProxyInfo): string {
    const basePath = proxy.path || '/';
    return `${proxy.domain}${basePath}`;
  }

  private showNotification(messageKey: string, proxyName?: string): void {
    if (!this.notifyManager) return;

    try {
      const translations = Extensions.getTranslations().proxy;
      let message = translations[messageKey as keyof typeof translations] || messageKey;

      if (proxyName && message.includes('{name}')) {
        message = message.replace('{name}', proxyName);
      }

      this.notifyManager?.showNotification({
        title: 'SoundCloud Proxy',
        body: message,
      });
    } catch (error) {
      console.warn('Failed to show proxy notification:', error);
    }
  }
}