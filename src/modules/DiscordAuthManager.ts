import {BrowserWindow} from 'electron';
import {Client, DiscordPresenceData} from 'discord-rpc';

// simplified user maybe need to move somewhere
interface DiscordUser {
    id: string;
    username: string | undefined;
    discriminator: string | undefined;
    avatar: string | undefined;
}

export class DiscordAuthManager {
    private static instance: DiscordAuthManager;
    private client: Client | null = null;
    private clientReady: boolean = false;
    private mainWindow: BrowserWindow | null = null;
    private readonly CLIENT_ID = '1431978756687265872';
    private reconnectAttempts: number = 0;
    private readonly MAX_RECONNECT_ATTEMPTS = 5;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private manualDisconnect: boolean = false;

    private constructor() {
    }

    // Singleton instance
    static getInstance(): DiscordAuthManager {
        if (!DiscordAuthManager.instance) {
            DiscordAuthManager.instance = new DiscordAuthManager();
        }
        return DiscordAuthManager.instance;
    }

    initialize(window: BrowserWindow): void {
        this.mainWindow = window;
        this.connect();
    }

    private async connect(): Promise<void> {
        try {

            if (this.client && this.clientReady) {
                throw new Error('Error while first connect');
            }

            if (this.client) {
                try {
                    this.client.destroy();
                } catch (e: any) {
                    throw new Error('Error destroying old client:', e);
                }
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

                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout discord may not be running'));
                    if (this.client) {
                        this.client.destroy();
                        this.client = null;
                    }
                }, 15000);

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

            this.client.login({clientId: this.CLIENT_ID}).catch((error) => {
                throw new Error('Login failed:', error);
            });

            await readyPromise;

        } catch (error: any) {
            console.error('Discord connection failed:', error);

            this.clientReady = false;

            if (this.client) {
                try {
                    this.client.destroy();
                } catch (e) {
                    console.error('Error while destroying client:', e);
                }
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
        }
    }

    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
            return;
        }

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

        this.reconnectTimeout = setTimeout(() => {
            this.connect();
        }, delay);
    }

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

    async setActivity(presence: DiscordPresenceData): Promise<boolean> {
        if (!this.client || !this.clientReady) {
            return false;
        }

        try {
            const pid = process.pid;

            const activityPayload: any = {
                type: presence.type ?? 2,
                details: presence.details,
                state: presence.state,
                startTimestamp: presence.timestamps?.start ? Math.floor(presence.timestamps.start / 1000) : undefined,
                endTimestamp: presence.timestamps?.end ? Math.floor(presence.timestamps.end / 1000) : undefined,
                largeImageKey: presence.assets?.large_image,
                largeImageText: 'SoundCloud',
                smallImageKey: 'play',
                smallImageText: 'Playing',
            };

            await (this.client as any).request('SET_ACTIVITY', {
                pid,
                activity: activityPayload,
            }); // lib is very shitty, unable to set activityType to listening normally =)

            return true;
        } catch (error: any) {
            console.error('Failed to set discord activity:', error);
            return false;
        }
    }

    async clearActivity(): Promise<void> {
        if (!this.client || !this.clientReady) {
            return;
        }

        try {
            await this.client.clearActivity();
        } catch (error: any) {
            console.error('Failed to clear discord activity:', error);
        }
    }

    async disconnect(): Promise<void> {
        this.manualDisconnect = true;

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.client) {
            try {
                await this.clearActivity();
                this.client.destroy();
            } catch (error: any) {
                console.error('Error while disconnecting:', error);
            }
            this.client = null;
            this.clientReady = false;
        }

        this.notifyWindow('discord:disconnected');
    }

    isConnected(): boolean {
        return this.clientReady;
    }

    async forceReconnect(): Promise<void> {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        this.reconnectAttempts = 0;
        this.manualDisconnect = false;

        if (this.client) {
            this.clientReady = false;
            try {
                this.client.destroy();
            } catch (e) {
                console.error('Error while destroying old client:', e);
            }
            this.client = null;
        }

        await new Promise(resolve => setTimeout(resolve, 500));
        await this.connect();
    }

    private notifyWindow(event: string, data?: any): void {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send(event, data);
        }
    }

    private getErrorMessage(error: any): string {
        const message = error.message || error.toString();

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
