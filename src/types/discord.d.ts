/**
 * TypeScript type definitions for discord-rpc library
 * @see https://github.com/discordjs/RPC
 */
declare module 'discord-rpc' {
  /**
   * Discord Rich Presence activity data
   */
  export interface DiscordPresenceData {
    /** Activity type (0 = Playing, 1 = Streaming, 2 = Listening, 3 = Watching, 5 = Competing) */
    type?: number;
    /** Status display type */
    status_display_type?: number;
    /** Primary activity text (e.g., song name) */
    details?: string;
    /** URL associated with details */
    details_url?: string;
    /** Secondary activity text (e.g., artist name) */
    state?: string;
    /** URL associated with state */
    state_url?: string;
    /** Activity images and icons */
    assets?: {
      /** Large image key or URL */
      large_image?: string;
      /** URL for large image */
      large_url?: string;
      /** Small image key or URL */
      small_image?: string;
      /** URL for small image */
      small_url?: string;
    };
    /** Activity timestamps for elapsed/remaining time */
    timestamps?: {
      /** Start timestamp in milliseconds */
      start?: number;
      /** End timestamp in milliseconds */
      end?: number;
    };
    /** Activity buttons (max 2) */
    buttons?: Array<{ label: string; url: string }>;
  }

  /**
   * Discord user information
   */
  export interface User {
    /** User's unique ID */
    id: string;
    /** User's display name */
    username: string;
    /** User's discriminator (deprecated, now always "0" for new usernames) */
    discriminator: string;
    /** User's avatar hash */
    avatar: string;
    /** Whether the user is a bot */
    bot?: boolean;
    /** User's flags bitfield */
    flags?: number;
    /** User's Nitro subscription type */
    premium_type?: number;
  }

  /**
   * Discord RPC client configuration options
   */
  export interface ClientOptions {
    /** Transport protocol to use */
    transport: 'ipc' | 'websocket';
  }

  /**
   * Discord RPC login options
   */
  export interface LoginOptions {
    /** Discord application client ID */
    clientId: string;
    /** Optional client secret for OAuth */
    clientSecret?: string;
    /** Optional OAuth access token */
    accessToken?: string;
    /** Optional RPC token */
    rpcToken?: string;
    /** Optional custom token endpoint */
    tokenEndpoint?: string;
    /** Optional OAuth scopes */
    scopes?: string[];
  }

  /**
   * Discord RPC client
   */
  export class Client {
    /** Currently logged in user, null if not connected */
    user: User | null;
    /** Application information (type depends on discord-rpc internal implementation) */
    application: unknown;

    constructor(options: ClientOptions);

    /**
     * Login to Discord RPC
     * @param options Login configuration
     * @returns Promise resolving with user information
     */
    login(options: LoginOptions): Promise<{ user: User }>;

    /**
     * Destroy the RPC client connection
     */
    destroy(): Promise<void>;

    /**
     * Clear the current Discord activity
     */
    clearActivity(): Promise<void>;

    /**
     * Register an event listener
     * @param event Event name
     * @param listener Event handler function
     */
    on(event: string, listener: (...args: unknown[]) => void): this;

    /**
     * Register a ready event listener
     * @param event 'ready' event
     * @param listener Handler called when client is ready
     */
    on(event: 'ready', listener: () => void): this;

    /**
     * Register a disconnected event listener
     * @param event 'disconnected' event
     * @param listener Handler called when client disconnects
     */
    on(event: 'disconnected', listener: () => void): this;

    /**
     * Register an error event listener
     * @param event 'error' event
     * @param listener Handler called on errors
     */
    on(event: 'error', listener: (error: Error) => void): this;

    /**
     * Register a one-time ready event listener
     * @param event 'ready' event
     * @param listener Handler called once when client is ready
     */
    once(event: 'ready', listener: () => void): this;
  }
}
