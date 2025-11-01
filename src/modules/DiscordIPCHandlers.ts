import { ipcMain, IpcMainEvent } from 'electron';
import { DiscordPresenceData } from 'discord-rpc';
import { DiscordAuthManager } from './DiscordAuthManager.js';

/**
 * Register IPC handlers for Discord integration
 * Handles communication between renderer process and Discord manager
 */
export function registerDiscordIPCHandlers(): void {
  const discordManager = DiscordAuthManager.getInstance();

  /**
   * Get current Discord connection status
   */
  ipcMain.on('discord:get-status', (event: IpcMainEvent) => {
    const status = {
      connected: discordManager.isConnected(),
      user: discordManager.getUser(),
    };
    event.reply('discord:status', status);
  });

  /**
   * Connect/reconnect to Discord
   */
  ipcMain.on('discord:connect', async (event: IpcMainEvent) => {
    try {
      await discordManager.forceReconnect();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Discord connect error:', errorMessage);
      event.reply('discord:error', {
        message: errorMessage || 'Failed to connect to Discord',
        canRetry: true,
      });
    }
  });

  /**
   * Disconnect from Discord
   */
  ipcMain.on('discord:disconnect', async (event: IpcMainEvent) => {
    try {
      await discordManager.disconnect();
      event.reply('discord:disconnected');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Discord disconnect error:', errorMessage);
    }
  });

  /**
   * Set Discord Rich Presence activity
   */
  ipcMain.on('discord:set-activity', async (event: IpcMainEvent, presence: DiscordPresenceData) => {
    // Forward presence data to Discord manager
    // The manager handles the actual RPC communication
    const success = await discordManager.setActivity(presence);

    if (!success) {
      event.reply('discord:error', {
        message: 'Failed to update Discord activity',
        canRetry: false,
      });
    }
  });

  /**
   * Clear Discord activity
   */
  ipcMain.on('discord:clear-activity', async () => {
    await discordManager.clearActivity();
  });
}
