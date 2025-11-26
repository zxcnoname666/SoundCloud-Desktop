import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import fetch from 'node-fetch';
import type { ProxyManagerInterface } from '../types/global.js';
import { ConfigManager } from '../utils/config.js';
import { Extensions } from './Extensions.js';
import type { NotificationManager } from './NotificationManager.js';
import { WindowSetup } from './WindowSetup';

interface ProxyInfo {
  source: string;
  domain: string;
  path?: string;
  headers?: Record<string, string>;
  protocol: 'http:' | 'https:';
  // Система strikes для отслеживания ошибок подряд
  strikes: number;
  // Время до которого прокси заблокирована (Unix timestamp в ms)
  blockedUntil: number;
  // Текущая длительность блокировки в мс (для exponential backoff)
  blockDuration: number;
}

export class ProxyManager implements ProxyManagerInterface {
  private static instance: ProxyManager;
  private allProxies: ProxyInfo[] = []; // Полный список прокси
  private activeProxies: ProxyInfo[] = []; // Активные прокси (из которых берём)
  private notifyManager: NotificationManager | null = null;
  private httpsAgent: https.Agent;
  private httpAgent: http.Agent;

  // Конфигурация системы strikes
  private readonly MAX_STRIKES = 3; // Максимум ошибок подряд
  private readonly INITIAL_BLOCK_DURATION = 60000; // 1 минута
  private readonly MAX_BLOCK_DURATION = 300000; // 5 минут

  private constructor() {
    // Создаем https.Agent с отключенным TLS 1.3 для обхода блокировок в России
    this.httpsAgent = new https.Agent({
      maxVersion: 'TLSv1.2',
      minVersion: 'TLSv1',
    });

    // Создаем http.Agent для HTTP прокси
    this.httpAgent = new http.Agent({
      keepAlive: true,
    });
  }

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

  async sendRequest(url: string, options: any = {}, useProxy = true): Promise<any> {
    if (WindowSetup.checkAdBlock(new URL(url))) {
      return new Response(null, { status: 403, statusText: 'Ad Blocker Detected' });
    }

    if (!useProxy || this.activeProxies.length === 0) {
      return fetch(url, { ...options, agent: this.httpsAgent });
    }

    // Всегда пробуем прокси с первого по списку
    const method = options.method || 'GET';
    const headers = options.headers || {};
    let lastError: string | null = null;

    // Разблокируем прокси у которых истекло время блокировки
    this.unblockExpiredProxies();

    // Фильтруем только доступные (не заблокированные) прокси
    const availableProxies = this.activeProxies.filter((p) => !this.isProxyBlocked(p));

    if (availableProxies.length === 0) {
      console.info('🚫 All proxies are blocked, trying direct connection');
      try {
        return await fetch(url, { ...options, agent: this.httpsAgent });
      } catch (directError) {
        throw new Error(`All proxies blocked. Direct error: ${directError}`);
      }
    }

    for (const proxy of availableProxies) {
      try {
        const encodedTargetUrl = Buffer.from(url).toString('base64');
        const proxyUrl = this.buildProxyUrl(proxy, encodedTargetUrl);

        // Используем большой timeout (5 минут) как fallback на крайний случай
        // Idle timeout (10 сек без данных) определяется в WindowSetup wrapper stream
        const proxyOptions: any = {
          method: method,
          signal: AbortSignal.timeout(300000), // 5 минут
          headers: {
            ...proxy.headers,
            ...headers,
            'X-Target': encodedTargetUrl,
          },
          agent: proxy.protocol === 'https:' ? this.httpsAgent : this.httpAgent,
        };

        if (options.body) {
          proxyOptions.body = options.body;
        }

        const response = await fetch(proxyUrl, proxyOptions);

        // Проверяем успешность ответа
        if (!response.ok && (response.status === 429 || response.status === 500)) {
          console.warn(
            `⚠️ Proxy ${proxy.domain} returned ${response.status}: ${response.statusText}`
          );
          lastError = `${response.status} ${response.statusText}`;

          // Регистрируем ошибку
          this.recordProxyFailure(proxy);
          continue;
        }

        // Успешный запрос - сбрасываем strikes и перемещаем в начало
        this.recordProxySuccess(proxy);
        return response;
      } catch (error) {
        console.debug(`❌ Proxy ${proxy.domain} failed:`, error);
        lastError = error instanceof Error ? error.message : String(error);

        // Регистрируем ошибку
        this.recordProxyFailure(proxy);
      }
    }

    // Если все прокси не работают, пробуем без прокси
    console.info('🔌 All available proxies failed, trying direct connection');
    try {
      return await fetch(url, { ...options, agent: this.httpsAgent });
    } catch (directError) {
      throw new Error(
        `All proxies failed and direct connection failed. Last proxy error: ${lastError || 'Unknown'}. Direct error: ${directError}`
      );
    }
  }

  async init(): Promise<void> {
    try {
      const configManager = ConfigManager.getInstance();
      const proxyConfig = configManager.loadProxyConfig();

      this.allProxies = this.parseProxies(proxyConfig.proxy || []);
      this.activeProxies = [...this.allProxies]; // Копируем полный список в активные

      if (this.allProxies.length === 0) {
        this.showNotification('proxy_available_not_found');
      } else {
        console.info(`✅ Loaded ${this.allProxies.length} proxies`);
        this.showNotification('proxy_loaded_count', String(this.allProxies.length));
      }
    } catch (error) {
      console.error('❌ Failed to initialize proxy manager:', error);
    }
  }

  getCurrentProxy(): string | null {
    return this.activeProxies[0]?.source || null;
  }

  /**
   * Проверяет заблокирована ли прокси
   */
  private isProxyBlocked(proxy: ProxyInfo): boolean {
    return proxy.blockedUntil > Date.now();
  }

  /**
   * Разблокирует прокси у которых истекло время блокировки
   */
  private unblockExpiredProxies(): void {
    const now = Date.now();
    for (const proxy of this.activeProxies) {
      if (proxy.blockedUntil > 0 && proxy.blockedUntil <= now) {
        console.info(`🔓 Unblocking proxy ${proxy.domain} (block expired)`);
        proxy.blockedUntil = 0;
        proxy.strikes = 0; // Сбрасываем strikes при разблокировке
      }
    }
  }

  /**
   * Регистрирует ошибку прокси: инкремент strikes, перемещение в конец, блокировка при лимите
   */
  private recordProxyFailure(proxy: ProxyInfo): void {
    proxy.strikes++;
    console.debug(`📊 Proxy ${proxy.domain} failure recorded (strikes: ${proxy.strikes})`);

    // Перемещаем в конец очереди (Priority Queue - D)
    this.moveProxyToEnd(proxy);

    // Если достигли лимита strikes - блокируем (Strikes + Temporary Block - A + B)
    if (proxy.strikes >= this.MAX_STRIKES) {
      this.blockProxy(proxy);
    }
  }

  /**
   * Регистрирует успешный запрос: сброс strikes, перемещение в начало
   */
  private recordProxySuccess(proxy: ProxyInfo): void {
    // Сбрасываем strikes при успехе
    if (proxy.strikes > 0) {
      console.info(`🔄 Proxy ${proxy.domain} recovered (strikes reset: ${proxy.strikes} -> 0)`);
      proxy.strikes = 0;
      proxy.blockDuration = this.INITIAL_BLOCK_DURATION; // Сбрасываем длительность блокировки
    }

    // Перемещаем в начало очереди (Priority Queue - D)
    this.moveProxyToStart(proxy);
  }

  /**
   * Блокирует прокси с exponential backoff
   */
  private blockProxy(proxy: ProxyInfo): void {
    // Если это первая блокировка - устанавливаем начальную длительность
    if (proxy.blockDuration === 0) {
      proxy.blockDuration = this.INITIAL_BLOCK_DURATION;
    } else {
      // Exponential backoff: удваиваем, но не больше MAX_BLOCK_DURATION
      proxy.blockDuration = Math.min(proxy.blockDuration * 2, this.MAX_BLOCK_DURATION);
    }

    proxy.blockedUntil = Date.now() + proxy.blockDuration;

    const blockMinutes = Math.round(proxy.blockDuration / 60000);
    console.warn(
      `🚫 Proxy ${proxy.domain} blocked for ${blockMinutes} minute(s) due to ${proxy.strikes} consecutive failures`
    );
  }

  /**
   * Перемещает прокси в конец очереди
   */
  private moveProxyToEnd(proxy: ProxyInfo): void {
    const index = this.activeProxies.findIndex((p) => p.source === proxy.source);
    if (index !== -1 && index !== this.activeProxies.length - 1) {
      this.activeProxies.splice(index, 1);
      this.activeProxies.push(proxy);
    }
  }

  /**
   * Перемещает прокси в начало очереди
   */
  private moveProxyToStart(proxy: ProxyInfo): void {
    const index = this.activeProxies.findIndex((p) => p.source === proxy.source);
    if (index !== -1 && index !== 0) {
      this.activeProxies.splice(index, 1);
      this.activeProxies.unshift(proxy);
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
            protocol: url.protocol as 'http:' | 'https:',
            // Инициализируем систему strikes
            strikes: 0,
            blockedUntil: 0,
            blockDuration: 0,
          };
        } catch (error) {
          console.debug(`⚠️ Failed to parse proxy: ${proxyString}`, error);
          return null;
        }
      })
      .filter(Boolean) as ProxyInfo[];
  }

  private buildProxyUrl(proxy: ProxyInfo, targetUrl: string): string {
    const basePath = encodeURI(
      decodeURI(proxy.path || '/')
        .replaceAll('{date}', Date.now().toString())
        .replaceAll('{target}', targetUrl)
    );

    return `${proxy.domain}${basePath}`;
  }

  private showNotification(messageKey: string, value?: string): void {
    if (!this.notifyManager) return;

    try {
      const translations = Extensions.getTranslations().proxy;
      let message = translations[messageKey as keyof typeof translations] || messageKey;

      if (value) {
        message = message.replace('{name}', value).replace('{count}', value);
      }

      this.notifyManager?.showNotification({
        title: 'SoundCloud Proxy',
        body: message,
      });
    } catch (error) {
      console.debug('⚠️ Failed to show proxy notification:', error);
    }
  }
}
