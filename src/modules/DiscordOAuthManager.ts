import { BrowserWindow, shell } from 'electron';
import express, { Request, Response } from 'express';
import http from 'http';
// currently unused, need to approve application from discord team to use normal api for activities, but it should works
interface DiscordUser {
    id: string;
    username: string;
    discriminator: string;
    avatar: string;
}
// And need to move this smwhere if it gonna be used
interface DiscordAPIUser {
    id: string;
    username: string;
    discriminator: string;
    avatar: string;
    bot?: boolean;
    system?: boolean;
    mfa_enabled?: boolean;
    banner?: string;
    accent_color?: number;
    locale?: string;
    verified?: boolean;
    email?: string;
    flags?: number;
    premium_type?: number;
    public_flags?: number;
}

interface DiscordActivity {
    application_id: string;
    name: string;
    platform: string;
    type: number;
    status_display_type: number;
    details?: string;
    details_url?: string;
    state?: string;
    state_url?: string;
    assets?: {
        large_image?: string;
        large_url?: string;
    };
    timestamps?: {
        start: number;
        end: number;
    };
}

export class DiscordOAuthManager {
    private static instance: DiscordOAuthManager;
    private accessToken: string | null = null; // TODO: add some storage or smth like that to store token and yse it after restart
    private user: DiscordUser | null = null;
    private mainWindow: BrowserWindow | null = null;
    private server: http.Server | null = null;
    private app: express.Application;

    private readonly CLIENT_ID = '1431978756687265872'; // TODO: Refactor hardcoded fields
    private readonly REDIRECT_URI = 'http://localhost:3001/auth/discord/redirect';
    private readonly PORT = 3001;
    private readonly DISCORD_API = 'https://discord.com/api/v10';

    private constructor() {
        this.app = express();
        this.setupRoutes();
    }

    static getInstance(): DiscordOAuthManager {
        if (!DiscordOAuthManager.instance) {
            DiscordOAuthManager.instance = new DiscordOAuthManager();
        }
        return DiscordOAuthManager.instance;
    }

    initialize(window: BrowserWindow): void {
        this.mainWindow = window;
    }

    private setupRoutes(): void {
        this.app.get('/auth/discord/redirect', (_req: Request, res: Response) => {
            // TODO: refactor this shitty html responding
            res.send(` 
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Discord Authorization</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            margin: 0;
                            background: #0d1117;
                            color: white;
                        }
                        .container {
                            text-align: center;
                            padding: 20px;
                        }
                        .success { color: #43b581; }
                        .error { color: #f04747; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2 id="status">Processing authorization...</h2>
                        <p id="message"></p>
                    </div>
                    <script>
                        const fragment = window.location.hash.substring(1);
                        const params = new URLSearchParams(fragment);
                        const accessToken = params.get('access_token');
                        
                        if (accessToken) {
                            fetch('/auth/discord/callback', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ access_token: accessToken })
                            })
                            .then(response => response.json())
                            .then(data => {
                                document.getElementById('status').textContent = 'Authorization Successful!';
                                document.getElementById('status').className = 'success';
                                document.getElementById('message').textContent = 'You can close this window now.';
                                setTimeout(() => window.close(), 2000);
                            })
                            .catch(error => {
                                document.getElementById('status').textContent = 'Authorization Failed';
                                document.getElementById('status').className = 'error';
                                document.getElementById('message').textContent = error.message;
                            });
                        } else {
                            document.getElementById('status').textContent = 'No Access Token';
                            document.getElementById('status').className = 'error';
                            document.getElementById('message').textContent = 'Authorization failed. Please try again.';
                        }
                    </script>
                </body>
                </html>
            `);
        });

        this.app.use(express.json());

        this.app.post('/auth/discord/callback', async (req: Request, res: Response): Promise<void> => {
            try {
                const { access_token } = req.body;

                if (!access_token) {
                    res.status(400).json({ error: 'No access token provided' });
                    return;
                }

                this.accessToken = access_token;

                const userInfo = await this.fetchUserInfo();

                if (userInfo) {
                    this.user = userInfo;
                    this.notifyWindow('discord:connected', this.user);
                    res.json({ success: true, user: userInfo });
                } else {
                    throw new Error('Failed to fetch user info');
                }
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                res.status(500).json({ error: errorMessage });
                this.notifyWindow('discord:error', { message: errorMessage });
            }
        });
    }

    private async fetchUserInfo(): Promise<DiscordUser | null> {
        if (!this.accessToken) return null;

        try {
            const response = await fetch(`${this.DISCORD_API}/users/@me`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch user: ${response.statusText}`);
            }

            const data = await response.json() as DiscordAPIUser;

            return {
                id: data.id,
                username: data.username,
                discriminator: data.discriminator,
                avatar: data.avatar
            };
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error: unknown) {
            return null;
        }
    }

    async startServer(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.server) {
                resolve();
                return;
            }

            this.server = this.app.listen(this.PORT, () => {
                resolve();
            });

            this.server.on('error', (error: NodeJS.ErrnoException) => {
                if (error.code === 'EADDRINUSE') {
                    reject(new Error(`Port ${this.PORT} is already in use`));
                } else {
                    reject(error);
                }
            });
        });
    }

    async stopServer(): Promise<void> {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    this.server = null;
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    async connect(): Promise<void> {
        try {
            await this.startServer();
            // TODO: Change this after approval
            const authUrl = `https://discord.com/oauth2/authorize?client_id=${this.CLIENT_ID}&redirect_uri=${encodeURIComponent(this.REDIRECT_URI)}&response_type=code&scope=identify+activities.write&state=bGWvAdSlh5ULVQhJgMAMhbX8Gv.TL.jk&code_challenge=d4aLh5oPLb16uO7HCEvZ_FgER4y2V0400BWfACQK-e4&code_challenge_method=S256`;

            await shell.openExternal(authUrl);

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.notifyWindow('discord:error', { message: errorMessage });
            throw error;
        }
    }

    async setActivity(activity: DiscordActivity): Promise<boolean> {
        if (!this.accessToken) {
            return false;
        }

        try {
            const payload = {
                activities: [activity],
                token: this.accessToken
            };

            const response = await fetch(`${this.DISCORD_API}/users/@me/headless-sessions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                    'Accept': '*/*'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                return false;
            }

            return true;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error: unknown) {
            return false;
        }
    }

    async clearActivity(): Promise<void> {
        if (!this.accessToken) return;

        try {
            await fetch(`${this.DISCORD_API}/users/@me/headless-sessions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ activities: [], token: this.accessToken })
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Failed to clear activity:', errorMessage);
        }
    }

    async disconnect(): Promise<void> {
        await this.clearActivity();
        await this.stopServer();
        this.accessToken = null;
        this.user = null;
        this.notifyWindow('discord:disconnected');
    }

    isConnected(): boolean {
        return this.accessToken !== null;
    }

    getUser(): DiscordUser | null {
        return this.user;
    }

    private notifyWindow(event: string, data?: any): void {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send(event, data);
        }
    }
}
