import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'fs';
import {dirname, join} from 'path';
import JSON5 from 'json5';
import type {AppConfig, ProxyConfig} from '../types/config.js';

interface CookieInfo {
    name: string;
    value: string;
    domain: string;
    path: string;
    expires?: number;
    secure?: boolean;
    httpOnly?: boolean;
}

interface AuthConfig {
    token?: string;
    cookies?: CookieInfo[];
    lastUpdated?: string;
}

export class ConfigManager {
    private static instance: ConfigManager;
    private config: AppConfig | null = null;

    private constructor() {
    }

    static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    loadConfig(configPath?: string): AppConfig {
        if (!configPath) {
            // Try to find config in order of preference
            const possiblePaths = [
                join(process.cwd(), 'config.json5'),
                join(process.cwd(), 'config.js'),
                join(process.cwd(), 'config.json'),
            ];

            for (const path of possiblePaths) {
                if (existsSync(path)) {
                    configPath = path;
                    break;
                }
            }

            if (!configPath) {
                throw new Error('No config file found. Looking for config.json5, config.js, or config.json');
            }
        }

        if (!existsSync(configPath)) {
            throw new Error(`Config file not found: ${configPath}`);
        }

        try {
            const configContent = readFileSync(configPath, 'utf-8');

            if (configPath.endsWith('.json5')) {
                this.config = JSON5.parse(configContent);
            } else if (configPath.endsWith('.js')) {
                delete require.cache[require.resolve(configPath)];
                this.config = require(configPath);
            } else {
                this.config = JSON.parse(configContent);
            }

            return this.config!;
        } catch (error) {
            throw new Error(`Failed to parse config file: ${error}`);
        }
    }

    getConfig(): AppConfig {
        if (!this.config) {
            throw new Error('Config not loaded. Call loadConfig() first.');
        }
        return this.config;
    }

    loadProxyConfig(appDataPath: string, fallbackPath: string): ProxyConfig {
        const proxyPath = join(appDataPath, 'soundcloud', 'config.proxy.json5');
        const fallbackProxyPath = join(fallbackPath, 'config.proxy.json5');

        let configPath = proxyPath;
        if (!existsSync(proxyPath) && existsSync(fallbackProxyPath)) {
            configPath = fallbackProxyPath;
        }

        if (!existsSync(configPath)) {
            return {proxy: []};
        }

        try {
            const configContent = readFileSync(configPath, 'utf-8');

            if (configPath.endsWith('.json5')) {
                return JSON5.parse(configContent);
            } else if (configPath.endsWith('.js')) {
                delete require.cache[require.resolve(configPath)];
                return require(configPath);
            } else {
                return JSON.parse(configContent);
            }
        } catch (error) {
            console.warn(`Failed to parse proxy config: ${error}`);
            return {proxy: []};
        }
    }

    setAuthToken(token: string): void {
        const authConfig = this.loadAuthConfig();
        authConfig.token = token;
        this.saveAuthConfig(authConfig);
    }

    getAuthToken(): string | null {
        const authConfig = this.loadAuthConfig();
        return authConfig.token || null;
    }

    setSoundCloudCookies(cookies: CookieInfo[]): void {
        const authConfig = this.loadAuthConfig();
        authConfig.cookies = cookies;
        this.saveAuthConfig(authConfig);
    }

    getSoundCloudCookies(): CookieInfo[] {
        const authConfig = this.loadAuthConfig();
        return authConfig.cookies || [];
    }

    clearAuthData(): void {
        const authConfig: AuthConfig = {};
        this.saveAuthConfig(authConfig);
    }

    private getAuthConfigPath(): string {
        const appDataPath = require('electron').app.getPath('appData');
        return join(appDataPath, 'soundcloud', 'auth.json5');
    }

    private loadAuthConfig(): AuthConfig {
        const authPath = this.getAuthConfigPath();

        if (!existsSync(authPath)) {
            return {};
        }

        try {
            const configContent = readFileSync(authPath, 'utf-8');
            return JSON5.parse(configContent);
        } catch (error) {
            console.warn('Failed to parse auth config:', error);
            return {};
        }
    }

    private saveAuthConfig(authConfig: AuthConfig): void {
        const authPath = this.getAuthConfigPath();
        const authDir = dirname(authPath);

        if (!existsSync(authDir)) {
            mkdirSync(authDir, {recursive: true});
        }

        authConfig.lastUpdated = new Date().toISOString();

        try {
            const configContent = JSON5.stringify(authConfig, null, 2);
            writeFileSync(authPath, configContent, 'utf-8');
        } catch (error) {
            throw new Error(`Failed to save auth config: ${error}`);
        }
    }
}