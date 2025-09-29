import type { BrowserWindow } from 'electron';

export interface AppContext {
  isDev: boolean;
  port: number;
  window?: BrowserWindow;
}

export interface WindowManager {
  createWindow(): Promise<BrowserWindow>;

  showWindow(): void;

  hideWindow(): void;

  closeWindow(): void;
}

export interface ProxyManagerInterface {
  init(): Promise<void>;

  getCurrentProxy(): string | null;

  sendRequest(url: string, options?: any, useProxy?: boolean): Promise<any>;
}

export interface ExtensionsInterface {
  protocolInject(): void;

  setEfficiency(pid: number, enable?: boolean): void;
}

export interface NotificationData {
  title: string;
  body: string;
  icon?: string;
}

export interface ServerConfig {
  port: number;
  host: string;
}
