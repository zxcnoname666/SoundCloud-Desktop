/**
 * Discord Rich Presence Integration for SoundCloud Player
 * Tracks player state and updates Discord activity
 */

const PLAYER_CHECK_INTERVAL_MS = 2000;

let currentTrack = null;
let playbackStartTime = null;
let isPlaying = false;
let playerCheckInterval = null; // Store interval ID for cleanup

/**
 * Initialize player tracking
 */
function initializePlayerTracking() {
  const webview = document.querySelector('webview');

  if (!webview) {
    console.warn('Webview not found for Discord integration');
    return;
  }

  observePlayerChanges(webview);
}

/**
 * Start observing player changes
 */
function observePlayerChanges(webview) {
  // Clear any existing interval to prevent duplicates
  if (playerCheckInterval) {
    clearInterval(playerCheckInterval);
  }

  playerCheckInterval = setInterval(() => {
    checkPlayerState(webview);
  }, PLAYER_CHECK_INTERVAL_MS);
}

/**
 * Check current player state from SoundCloud page
 */
async function checkPlayerState(webview) {
  try {
    const trackData = await webview.executeJavaScript(`
      (function() {
        const titleElement = document.querySelector('.playbackSoundBadge__titleLink > span:nth-child(2)');
        const artistElement = document.querySelector('.playbackSoundBadge__lightLink');
        const playButton = document.querySelector('.playControl');
        const artworkElement = document.querySelector('.playbackSoundBadge__avatar span');
        const timePassedElement = document.querySelector('div.playbackTimeline__timePassed > span:nth-child(2)');
        const durationElement = document.querySelector('div.playbackTimeline__duration > span:nth-child(2)');

        if (!titleElement) return null;

        let artworkUrl = null;
        if (artworkElement) {
          const bgImage = window.getComputedStyle(artworkElement).backgroundImage;
          const urlMatch = bgImage.match(/url\\(["']?(.+?)["']?\\)/);
          if (urlMatch && urlMatch[1]) {
            artworkUrl = urlMatch[1];
            // Use smaller image for better performance
            artworkUrl = artworkUrl.replace(/-[^.]*\\.jpg$/, '-t120x120.jpg');
          }
        }

        const trackUrl = document.querySelector('.playbackSoundBadge__titleLink')?.href || window.location.href;
        const artistUrl = artistElement ? artistElement.href : null;

        // Parse time information
        let currentTime = 0;
        let duration = 0;

        if (timePassedElement) {
          currentTime = parseTimeToSeconds(timePassedElement.textContent);
        }

        if (durationElement) {
          const durationText = durationElement.textContent;
          if (durationText.startsWith('-')) {
            // Handle negative duration (time remaining)
            duration = currentTime + parseTimeToSeconds(durationText.slice(1));
          } else {
            duration = parseTimeToSeconds(durationText);
          }
        }

        function parseTimeToSeconds(timeStr) {
          const parts = timeStr.split(':').map(part => parseInt(part) || 0);
          if (parts.length === 3) {
            // HH:MM:SS
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
          } else if (parts.length === 2) {
            // MM:SS
            return parts[0] * 60 + parts[1];
          }
          return 0;
        }

        return {
          title: titleElement.textContent || titleElement.title || 'Unknown Track',
          artist: artistElement ? artistElement.textContent : 'Unknown Artist',
          url: trackUrl,
          artistUrl: artistUrl,
          isPlaying: playButton ? playButton.classList.contains('playing') : false,
          artwork: artworkUrl,
          currentTime: currentTime,
          duration: duration
        };
      })();
    `);

    if (trackData) {
      handleTrackChange(trackData);
    } else {
      if (currentTrack !== null) {
        clearDiscordPresence();
        currentTrack = null;
      }
    }
  } catch (error) {
    console.error('Failed to get player state:', error);
  }
}

/**
 * Handle track or playback state changes
 */
function handleTrackChange(trackData) {
  const trackChanged =
    !currentTrack ||
    currentTrack.title !== trackData.title ||
    currentTrack.artist !== trackData.artist;

  const playStateChanged = isPlaying !== trackData.isPlaying;

  if (trackChanged || playStateChanged) {
    currentTrack = trackData;
    isPlaying = trackData.isPlaying;

    if (isPlaying) {
      playbackStartTime = Date.now();
      updateDiscordRichPresence(trackData);
    } else {
      updateDiscordRichPresence({
        ...trackData,
        startTimestamp: null,
      });
    }
  } else if (isPlaying && currentTrack) {
    updateDiscordRichPresence(trackData);
  }
}

/**
 * Update Discord Rich Presence with current track info
 */
function updateDiscordRichPresence(trackInfo) {
  if (!isConnected || typeof ipcRenderer === 'undefined') return;

  const cleanTitle = trackInfo.title.replace(/^Current track:\s*/i, '').trim();

  let timestamps = null;

  if (trackInfo.isPlaying && trackInfo.duration > 0) {
    const startTime = Math.floor(Date.now() / 1000) - trackInfo.currentTime;
    const endTime = startTime + trackInfo.duration;
    timestamps = {
      start: startTime * 1000,
      end: endTime * 1000,
    };
  }

  const presence = {
    type: 2, // Listening activity type
    status_display_type: 1,
    details: truncateText(cleanTitle, 128) || 'Unknown Track',
    details_url: cleanSoundCloudUrl(trackInfo.url),
    state: truncateText(trackInfo.artist, 110) || 'Unknown Artist',
    state_url: trackInfo.artistUrl ? cleanSoundCloudUrl(trackInfo.artistUrl) : undefined,
    assets: {
      large_image: trackInfo.artwork || 'soundcloud_logo',
      large_url: cleanSoundCloudUrl(trackInfo.url),
    },
    timestamps: timestamps,
  };

  ipcRenderer.send('discord:set-activity', presence);
}

/**
 * Clean URL by removing query parameters and hash
 */
function cleanSoundCloudUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.origin + urlObj.pathname;
  } catch {
    return url;
  }
}

/**
 * Truncate text to maximum length
 */
function truncateText(text, maxLength) {
  if (!text) return text;
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength - 3)}...`;
}

/**
 * Clear Discord presence
 */
function clearDiscordPresence() {
  if (typeof ipcRenderer !== 'undefined') {
    ipcRenderer.send('discord:clear-activity');
  }
}

/**
 * Cleanup function to stop player tracking
 */
function stopPlayerTracking() {
  if (playerCheckInterval) {
    clearInterval(playerCheckInterval);
    playerCheckInterval = null;
  }
  clearDiscordPresence();
  currentTrack = null;
  isPlaying = false;
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const webview = document.querySelector('webview');

  if (webview) {
    webview.addEventListener('dom-ready', () => {
      initializePlayerTracking();
    });
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    stopPlayerTracking();
  });
});
