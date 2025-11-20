import {BrowserWindow, ipcMain} from 'electron';
import {ConfigManager} from '../utils/config.js';

interface CookieInfo {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  secure?: boolean;
  httpOnly?: boolean;
}

export class AuthManager {
  private static instance: AuthManager;

  private constructor() {}

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  initialize(): void {
      console.info('🔐 AuthManager initializing...');
    this.registerIPCHandlers();
  }

  async initializeWithWindow(): Promise<void> {
    await this.loadSavedToken();
  }

  private async loadSavedToken(): Promise<void> {
    try {
        console.info('🔍 Checking for saved auth token...');

      const configManager = ConfigManager.getInstance();
      const savedToken = configManager.getAuthToken();

      if (savedToken) {
          console.info('🔑 Found saved auth token, applying...');
        await this.applyCookiesToSession(this.parseTokenToCookies(savedToken));
          console.info('✅ Saved auth token loaded successfully');
      } else {
          console.info('ℹ️  No saved auth token found');
      }
    } catch (error) {
      console.warn('Failed to load saved auth token:', error);
    }
  }

  private registerIPCHandlers(): void {
    ipcMain.handle('save-auth-token', async (_event, token: string) => {
      try {
        const configManager = ConfigManager.getInstance();
        configManager.setAuthToken(token);

        // Apply cookies to webview session
        await this.applyCookiesToSession(this.parseTokenToCookies(token));

        return { success: true };
      } catch (error) {
        console.error('Failed to save auth token:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    ipcMain.handle('clear-auth-token', async () => {
      try {
        const configManager = ConfigManager.getInstance();
        configManager.setAuthToken('');

        // Clear cookies from session
        await this.clearCookiesFromSession();

        return { success: true };
      } catch (error) {
        console.error('Failed to clear auth token:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });
  }

  private parseTokenToCookies(token: string): CookieInfo[] {
    // Simple implementation - in reality, you'd parse the actual token format
    return [
      {
        name: 'oauth_token',
        value: token,
        domain: '.soundcloud.com',
        path: '/',
        secure: true,
        httpOnly: false,
      },
    ];
  }

  private async applyCookiesToSession(cookies: CookieInfo[]): Promise<void> {
    try {
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (!mainWindow) {
        throw new Error('No main window found');
      }

      // Apply cookies to the main session for now
      // In a real implementation, we'd want to apply to webview session specifically
      const session = mainWindow.webContents.session;

      for (const cookie of cookies) {
        try {
          const cookieDetails: any = {
            url: `https://${cookie.domain.replace(/^\./, '')}`,
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path || '/',
            secure: cookie.secure || false,
            httpOnly: cookie.httpOnly || false,
          };

          if (cookie.expires) {
            cookieDetails.expirationDate = cookie.expires;
          }

          await session.cookies.set(cookieDetails);
        } catch (error) {
          console.warn(`Failed to set cookie ${cookie.name}:`, error);
        }
      }

        console.info(`Applied ${cookies.length} cookies to session`);
    } catch (error) {
      console.error('Failed to apply cookies to session:', error);
    }
  }

  private async clearCookiesFromSession(): Promise<void> {
    try {
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (!mainWindow) {
        throw new Error('No main window found');
      }

      const session = mainWindow.webContents.session;

      // Remove oauth_token cookie from SoundCloud domain
      await session.cookies.remove('https://soundcloud.com', 'oauth_token');

        console.info('Cleared authentication cookies from session');
    } catch (error) {
      console.error('Failed to clear cookies from session:', error);
    }
  }
}
