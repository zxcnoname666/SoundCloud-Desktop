declare module 'discord-rpc' {
    export interface DiscordPresenceData {
        type?: number;
        status_display_type?: number;
        details?: string;
        details_url?: string;
        state?: string;
        state_url?: string;
        assets?: {
            large_image?: string;
            large_url?: string;
            small_image?: string;
            small_url?: string;
        };
        timestamps?: {
            start?: number;
            end?: number;
        };
        buttons?: Array<{ label: string; url: string }>;
    }

    export interface User {
        id: string;
        username: string;
        discriminator: string;
        avatar: string;
        bot?: boolean;
        flags?: number;
        premium_type?: number;
    }

    export interface ClientOptions {
        transport: 'ipc' | 'websocket';
    }

    export interface LoginOptions {
        clientId: string;
        clientSecret?: string;
        accessToken?: string;
        rpcToken?: string;
        tokenEndpoint?: string;
        scopes?: string[];
    }

    export class Client {
        constructor(options: ClientOptions);

        user: User | null;
        application: any;

        login(options: LoginOptions): Promise<{ user: User }>;
        destroy(): Promise<void>;

        clearActivity(): Promise<void>;

        on(event: string, listener: (...args: any[]) => void): this;

        on(event: 'ready', listener: () => void): this;
        on(event: 'disconnected', listener: () => void): this;
        on(event: 'error', listener: (error: Error) => void): this;

        once(event: 'ready', listener: () => void): this;
    }
}

