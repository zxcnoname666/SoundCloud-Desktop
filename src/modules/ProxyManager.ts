import {URL} from 'node:url';
import fetch from 'node-fetch';
import type {ProxyManagerInterface} from '../types/global.js';
import {ConfigManager} from '../utils/config.js';
import {Extensions} from './Extensions.js';
import type {NotificationManager} from './NotificationManager.js';

interface ProxyInfo {
    source: string;
    domain: string;
    path?: string;
    headers?: Record<string, string>;
}

export class ProxyManager implements ProxyManagerInterface {
    private static instance: ProxyManager;
    private proxies: ProxyInfo[] = [];
    private currentProxy: ProxyInfo | null = null;
    private notifyManager: NotificationManager | null = null;

    private constructor() {
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

    async init(): Promise<void> {
        try {
            const configManager = ConfigManager.getInstance();
            const proxyConfig = configManager.loadProxyConfig(
                require('electron').app.getPath('appData'),
                process.cwd()
            );

            this.proxies = this.parseProxies(proxyConfig.proxy || []);
            await this.testAndSetupProxies();
        } catch (error) {
            console.warn('Failed to initialize proxy manager:', error);
        }
    }

    getCurrentProxy(): string | null {
        return this.currentProxy?.source || null;
    }

    async sendRequest(url: string, options: any = {}, useProxy = true): Promise<any> {
        if (!useProxy || !this.currentProxy) {
            return fetch(url, options);
        }

        const method = options.method || 'GET';
        const headers = options.headers || {};
        const proxyUrl = this.buildProxyUrl(this.currentProxy);

        const proxyOptions: any = {
            method: method, // Используем оригинальный метод запроса
            signal: AbortSignal.timeout(15000),
            headers: {
                ...this.currentProxy.headers,
                ...headers, // Передаем оригинальные заголовки как есть
                'X-Proxy-Target-URL': url, // Передаем целевой URL в заголовке
            },
        };

        // Если есть тело запроса, передаем его
        if (options.body) {
            proxyOptions.body = options.body;
        }

        return fetch(proxyUrl, proxyOptions);
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

    private async testAndSetupProxies(): Promise<void> {
        if (this.proxies.length === 0) {
            this.showNotification('proxy_available_not_found');
            return;
        }

        const firstProxy = this.proxies[0];
        if (firstProxy) {
            this.currentProxy = firstProxy;
            console.log(`Using web proxy: ${firstProxy.domain}`);
            this.showNotification('proxy_connected', new URL(firstProxy.domain).hostname);
        }
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
