/**
 * Discord integration configuration
 * Centralized constants for Discord Rich Presence integration
 */

export const DISCORD_CONFIG = {
  /**
   * Discord Application Client ID
   * @see https://discord.com/developers/applications
   */
  CLIENT_ID: process.env['DISCORD_CLIENT_ID'] || '1431978756687265872',

  /**
   * Discord application name displayed in Rich Presence
   */
  APPLICATION_NAME: 'SoundCloud',

  /**
   * Platform identifier for Rich Presence
   */
  PLATFORM: 'desktop',

  /**
   * Activity type (2 = Listening)
   * @see https://discord.com/developers/docs/topics/gateway-events#activity-object-activity-types
   */
  ACTIVITY_TYPE_LISTENING: 2,

  /**
   * Connection timeout in milliseconds
   */
  CONNECTION_TIMEOUT_MS: 15000,

  /**
   * Maximum number of reconnection attempts
   */
  MAX_RECONNECT_ATTEMPTS: 5,

  /**
   * Player state check interval in milliseconds
   */
  PLAYER_CHECK_INTERVAL_MS: 2000,
} as const;
