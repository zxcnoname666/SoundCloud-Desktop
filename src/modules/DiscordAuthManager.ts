import {Client, type DiscordPresenceData} from 'discord-rpc';
import type {BrowserWindow} from 'electron';
import {DISCORD_CONFIG} from '../config/discord.js';

/**
 * Discord user information
 */
export interface DiscordUser {
  id: string;
  username: string | undefined;
  discriminator: string | undefined;
  avatar: string | undefined;
}

/**
 * Internal activity payload structure for discord-rpc library
 * Note: This uses the internal RPC request format, not the standard setActivity API
 * because the library doesn't properly support LISTENING activity type through the normal API
 */
interface DiscordRPCActivityPayload {
  type: number;
  details?: string | undefined;
  state?: string | undefined;
  startTimestamp?: number | undefined;
  endTimestamp?: number | undefined;
  largeImageKey?: string | undefined;
  largeImageText?: string | undefined;
  smallImageKey?: string | undefined;
  smallImageText?: string | undefined;
}

/**
 * Discord RPC Client with extended request method
 */
interface DiscordRPCClient extends Client {
  request(command: string, args: unknown): Promise<unknown>;
}

/**
 * Manages Discord Rich Presence integration using Discord RPC
 * Handles connection, reconnection, and activity updates
 */
export class DiscordAuthManager {
  private static instance: DiscordAuthManager;
  private client: Client | null = null;
  private clientReady = false;
  private mainWindow: BrowserWindow | null = null;
  private readonly CLIENT_ID = DISCORD_CONFIG.CLIENT_ID;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = DISCORD_CONFIG.MAX_RECONNECT_ATTEMPTS;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private manualDisconnect = false;
  private isReconnecting = false; // Prevents multiple simultaneous reconnection attempts

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): DiscordAuthManager {
    if (!DiscordAuthManager.instance) {
      DiscordAuthManager.instance = new DiscordAuthManager();
    }
    return DiscordAuthManager.instance;
  }

  /**
   * Initialize the Discord manager with the main window
   */
  async initialize(window: BrowserWindow): Promise<void> {
    this.mainWindow = window;
      await this.connect();
  }

  /**
   * Disconnect from Discord RPC
   */
  async disconnect(): Promise<void> {
    this.manualDisconnect = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.client) {
      try {
        await this.clearActivity();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error while clearing activity:', errorMessage);
      }
        await this.safeDestroy(this.client);
      this.client = null;
      this.clientReady = false;
    }

    this.notifyWindow('discord:disconnected');
  }

  /**
   * Set Discord Rich Presence activity
   * Uses internal RPC request API to properly support LISTENING activity type
   */
  async setActivity(presence: DiscordPresenceData): Promise<boolean> {
    if (!this.client || !this.clientReady) {
      return false;
    }

    try {
      const pid = process.pid;

      const activityPayload: DiscordRPCActivityPayload = {
        type: presence.type ?? DISCORD_CONFIG.ACTIVITY_TYPE_LISTENING,
        details: presence.details,
        state: presence.state,
        startTimestamp: presence.timestamps?.start
          ? Math.floor(presence.timestamps.start / 1000)
          : undefined,
        endTimestamp: presence.timestamps?.end
          ? Math.floor(presence.timestamps.end / 1000)
          : undefined,
        largeImageKey: presence.assets?.large_image,
        largeImageText: DISCORD_CONFIG.APPLICATION_NAME,
        smallImageKey: 'play',
        smallImageText: 'Playing',
      };

      // Use internal request API because discord-rpc library doesn't properly support
      // LISTENING activity type through the standard setActivity method
      const rpcClient = this.client as DiscordRPCClient;
      await rpcClient.request('SET_ACTIVITY', {
        pid,
        activity: activityPayload,
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to set discord activity:', errorMessage);
      return false;
    }
  }

  /**
   * Get current Discord user information
   */
  getUser(): DiscordUser | null {
    if (!this.client || !this.clientReady) {
      return null;
    }

    const user = this.client.user;
    if (!user) return null;

    return {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
    };
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.warn('Max reconnection attempts reached');
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);

    console.log(
      `Reconnecting to Discord in ${delay}ms (attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`
    );

      this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null;
          await this.connect();
    }, delay);
  }

  /**
   * Clear current Discord activity
   */
  async clearActivity(): Promise<void> {
    if (!this.client || !this.clientReady) {
      return;
    }

    try {
      await this.client.clearActivity();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to clear discord activity:', errorMessage);
    }
  }

  /**
   * Force a reconnection attempt
   */
  async forceReconnect(): Promise<void> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.reconnectAttempts = 0;
    this.manualDisconnect = false;
    this.isReconnecting = false;

    if (this.client) {
      this.clientReady = false;
        await this.safeDestroy(this.client);
      this.client = null;
    }

    // Small delay before reconnecting
    await new Promise((resolve) => setTimeout(resolve, 500));
    await this.connect();
  }

  /**
   * Check if connected to Discord
   */
  isConnected(): boolean {
    return this.clientReady;
  }

  /**
   * Attempt to connect to Discord RPC
   */
  private async connect(): Promise<void> {
    // Prevent multiple simultaneous connection attempts
    if (this.isReconnecting) {
      return;
    }

    this.isReconnecting = true;

    try {
      if (this.client && this.clientReady) {
        throw new Error('Client is already connected');
      }

      // Clean up existing client
      if (this.client) {
          await this.safeDestroy(this.client);
        this.client = null;
      }

      this.client = new Client({
        transport: 'ipc',
      });

      const readyPromise = new Promise<void>((resolve, reject) => {
        if (!this.client) {
          reject(new Error('Client is null'));
          return;
        }

          const timeout = setTimeout(async () => {
          reject(new Error('Connection timeout - Discord may not be running'));
          if (this.client) {
              await this.safeDestroy(this.client);
            this.client = null;
          }
        }, DISCORD_CONFIG.CONNECTION_TIMEOUT_MS);

        this.client.once('ready', () => {
          clearTimeout(timeout);
          this.clientReady = true;
          this.reconnectAttempts = 0;
          this.notifyWindow('discord:connected', this.getUser());
          resolve();
        });

        this.client.on('error', (error: Error) => {
          console.error('Discord client error:', error);
          reject(error);
        });
      });

      this.client.on('disconnected', () => {
        this.clientReady = false;
        if (this.manualDisconnect) {
          this.manualDisconnect = false;
          return;
        }
        this.notifyWindow('discord:disconnected');
        this.attemptReconnect();
      });

      // Start login process
      // Errors are handled by client.on('error') which rejects readyPromise
      // If no response, timeout will reject readyPromise and cleanup
      // Don't add .catch() here as it would suppress errors
        await this.client.login({clientId: this.CLIENT_ID});

      await readyPromise;
    } catch (error) {
      console.error('Discord connection failed:', error);

      this.clientReady = false;

      if (this.client) {
          await this.safeDestroy(this.client);
        this.client = null;
      }

      const errorMessage = this.getErrorMessage(error);

      this.notifyWindow('discord:error', {
        message: errorMessage,
        canRetry: this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS,
      });

      if (this.reconnectAttempts > 0) {
        this.attemptReconnect();
      }
    } finally {
      this.isReconnecting = false;
    }
  }

  /**
   * Safely destroy Discord client, handling any transport errors
   */
  private async safeDestroy(client: Client | null): Promise<void> {
    if (!client) {
      return;
    }

    try {
      // discord-rpc library may throw errors when destroying a client
      // with an already-closed transport (e.g., "Cannot read properties of null (reading 'write')")
      // We catch and suppress these errors since the client is being destroyed anyway
        await client.destroy();
    } catch (error) {
      // Suppress transport-related errors during destroy
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("Cannot read properties of null") &&
          !message.includes("write") &&
          !message.includes("send")) {
        // Log unexpected errors
        console.warn('Unexpected error during client destroy:', error);
      }
      // Intentionally suppress expected transport errors
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Send event to renderer window
   */
  private notifyWindow(event: string, data?: unknown): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(event, data);
    }
  }

  /**
   * Get user-friendly error message from error object
   */
  private getErrorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('ENOENT') || message.includes('Could not connect')) {
      return 'Discord is not running. Please start Discord and try again.';
    }
    if (message.includes('ECONNREFUSED')) {
      return 'Discord RPC connection refused. Make sure Discord is running.';
    }
    if (message.includes('timeout') || message.includes('TIMEOUT')) {
      return 'Connection timeout. Make sure Discord is running and Rich Presence is enabled.';
    }
    if (message.includes('ECONNRESET')) {
      return 'Connection reset. Discord may have restarted. Please try again.';
    }

    return `Failed to connect to Discord: ${message}`;
  }
}
