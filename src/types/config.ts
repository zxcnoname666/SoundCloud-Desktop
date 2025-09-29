export interface Translation {
    proxy_available_not_found: string;
    proxy_work_not_found: string;
    proxy_connected: string;
    updater_title: string;
    updater_details: string;
    updater_notes: string;
    updater_install: string;
    updater_later: string;
    updater_installation_error: string;
    updater_missing_hash: string;
    updater_missing_hash_message: string;
    tasks_quit: string;
    tasks_quit_desc: string;
}

export interface AppConfig {
    proxy: ProxyConfig;
    autoUpdate: boolean;
    translations: Record<string, Translation>;
}

export interface ProxyConfig {
    proxy: string[];
}

export type SupportedLanguage = 'ru' | 'en' | 'kk' | 'ky' | 'be';

export interface WindowBounds {
    width: number;
    height: number;
    minWidth?: number;
    minHeight?: number;
    x?: number;
    y?: number;
}
