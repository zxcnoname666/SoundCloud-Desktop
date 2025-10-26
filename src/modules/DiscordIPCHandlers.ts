import {ipcMain} from 'electron';
import {DiscordAuthManager} from './DiscordAuthManager.js';

export function registerDiscordIPCHandlers(): void {
    const discordManager = DiscordAuthManager.getInstance();

    ipcMain.on('discord:get-status', (event) => {
        const status = {
            connected: discordManager.isConnected(),
            user: discordManager.getUser(),
        };
        event.reply('discord:status', status);
    });

    ipcMain.on('discord:connect', async (event) => {
        try {
            await discordManager.forceReconnect();
        } catch (error: any) {
            console.error('Discord connect error:', error);
            event.reply('discord:error', {
                message: error.message || 'Failed to start OAuth flow',
                canRetry: true,
            });
        }
    });

    ipcMain.on('discord:disconnect', async (event) => {
        try {
            await discordManager.disconnect();
            event.reply('discord:disconnected');
        } catch (error: any) {
            console.error('Discord disconnect error:', error);
        }
    });

    ipcMain.on('discord:set-activity', async (event, presence) => {
        const activity = {
            application_id: '1431978756687265872',
            name: 'SoundCloud',
            platform: 'desktop',
            type: presence.type || 2,
            status_display_type: 1,
            details: presence.details,
            details_url: presence.details_url,
            state: presence.state,
            state_url: presence.state_url,
            assets: presence.assets,
            timestamps: {
                start: presence.timestamps.start,
                end: presence.timestamps.end
            } // some fields currently unused, need to approve application from discord team to use normal api for activities
        };

        const success = await discordManager.setActivity(activity);
        if (!success) {
            event.reply('discord:error', {
                message: 'Failed to update discord activity',
                canRetry: false,
            });
        }
    });

    ipcMain.on('discord:clear-activity', async () => {
        await discordManager.clearActivity();
    });
}
