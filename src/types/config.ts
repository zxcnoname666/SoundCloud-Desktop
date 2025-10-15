export interface Translation {
  proxy_available_not_found: string;
  proxy_work_not_found: string;
  proxy_connected: string;
  proxy_loaded_count: string;
  updater_title: string;
  updater_details: string;
  updater_notes: string;
  updater_install: string;
  updater_later: string;
  updater_installation_error: string;
  updater_missing_hash: string;
  updater_missing_hash_message: string;
  updater_manual_install_title: string;
  updater_manual_install_message: string;
  tasks_quit: string;
  tasks_quit_desc: string;
  auth_modal_title: string;
  auth_token_title: string;
  auth_token_description: string;
  auth_token_placeholder: string;
  auth_save_button: string;
  auth_guide_title: string;
  auth_guide_step1_title: string;
  auth_guide_step1_desc: string;
  auth_guide_step2_title: string;
  auth_guide_step2_desc: string;
  auth_guide_step3_title: string;
  auth_guide_step3_desc: string;
  auth_guide_step4_title: string;
  auth_guide_step4_desc: string;
  auth_guide_step5_title: string;
  auth_guide_step5_desc: string;
  auth_guide_step6_title: string;
  auth_guide_step6_desc: string;
  auth_guide_warning: string;
  auth_status_token_invalid: string;
  auth_status_enter_token: string;
  auth_status_saving: string;
  auth_status_saved: string;
  auth_status_failed: string;
  auth_status_ipc_unavailable: string;
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
