/**
 * Discord Integration UI Management
 * Handles Discord connection UI, modals, and IPC communication
 */

let discordUser = null;
let isConnected = false;
let discordTranslations = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadDiscordTranslations();
  await initializeDiscordUI();
  await initializeDiscordModal();
  setupDiscordListeners();
});

/**
 * Load translations for Discord UI
 */
async function loadDiscordTranslations() {
  try {
    if (typeof ipcRenderer !== 'undefined') {
      const t = await ipcRenderer.invoke('app:get-translations');
      if (t?.discord) {
        discordTranslations = t.discord;
        return;
      }
    }
  } catch (error) {
    console.warn('Failed to load Discord translations, using defaults:', error);
  }

  // Fallback translations
  discordTranslations = {
    modal_title: '🎮 Discord Integration',
    connection_title: '🔗 Discord Connection',
    connection_description: "Connect your Discord account to show what you're listening to.",
    connect_button: 'Connect to Discord',
    disconnect_button: 'Disconnect',
    status_connected: 'Connected',
    status_disconnected: 'Not Connected',
    guide_title: 'How Discord integration works:',
    guide_step1_title: 'Launch Discord Desktop',
    guide_step1_desc: 'Make sure Discord application is running on your computer',
    guide_step2_title: 'Enable Activity Status',
    guide_step2_desc: 'Go to Discord Settings → Activity Privacy',
    guide_step3_title: 'Enable Status Sharing',
    guide_step3_desc: 'Turn on "Display current activity as a status message"',
    guide_step4_title: 'Connect in App',
    guide_step4_desc: 'Click "Connect to Discord" button above',
    guide_step5_title: 'Automatic Updates',
    guide_step5_desc: 'Your Discord status will update automatically when you play music',
    guide_warning: 'Important: Discord Desktop must be running for this feature to work!',
    status_connecting: 'Connecting to Discord...',
    status_connected_success: 'Connected to Discord!',
    status_disconnected_info: 'Disconnected from Discord',
    status_error: 'Failed to connect: {error}',
  };
}

/**
 * Initialize Discord UI state
 */
async function initializeDiscordUI() {
  if (typeof ipcRenderer !== 'undefined') {
    ipcRenderer.send('discord:get-status');
  } else {
    console.error('ipcRenderer not available - Discord integration will not work');
  }
}

/**
 * Initialize Discord modal with translations
 */
async function initializeDiscordModal() {
  if (!discordTranslations) {
    console.warn('Discord translations not loaded, skipping modal initialization');
    return;
  }

  const t = discordTranslations;

  const modalTitle = document.querySelector('#discordModal .discord-modal-header h2');
  if (modalTitle) modalTitle.textContent = t.modal_title;

  const connectionTitle = document.querySelector('#discordModal .discord-section h3');
  if (connectionTitle) connectionTitle.textContent = t.connection_title;

  const connectionDesc = document.querySelector('#discordModal .discord-section p');
  if (connectionDesc) connectionDesc.textContent = t.connection_description;

  const guideTitle = document.querySelector('#discordModal .discord-guide h4');
  if (guideTitle) guideTitle.textContent = t.guide_title;

  const steps = document.querySelectorAll('#discordModal .guide-step');
  const stepTranslations = [
    { title: t.guide_step1_title, desc: t.guide_step1_desc },
    { title: t.guide_step2_title, desc: t.guide_step2_desc },
    { title: t.guide_step3_title, desc: t.guide_step3_desc },
    { title: t.guide_step4_title, desc: t.guide_step4_desc },
    { title: t.guide_step5_title, desc: t.guide_step5_desc },
  ];

  steps.forEach((step, index) => {
    const translation = stepTranslations[index];
    if (translation) {
      const titleEl = step.querySelector('.step-content strong');
      const descEl = step.querySelector('.step-content p');
      if (titleEl) titleEl.textContent = translation.title;
      if (descEl) descEl.innerHTML = translation.desc;
    }
  });

  const warning = document.querySelector('#discordModal .guide-note');
  if (warning) warning.innerHTML = `<strong>${t.guide_warning}</strong>`;
}

/**
 * Setup IPC event listeners for Discord events
 */
function setupDiscordListeners() {
  if (typeof ipcRenderer === 'undefined') {
    console.error('ipcRenderer not available for listeners');
    return;
  }

  ipcRenderer.on('discord:connected', (event, user) => {
    isConnected = true;
    discordUser = user;
    updateDiscordUI();
    updateDiscordModalUI();
    if (discordTranslations) {
      showDiscordNotification(discordTranslations.status_connected_success, 'success');
    }
  });

  ipcRenderer.on('discord:disconnected', () => {
    isConnected = false;
    discordUser = null;
    updateDiscordUI();
    updateDiscordModalUI();
    if (discordTranslations) {
      showDiscordNotification(discordTranslations.status_disconnected_info, 'warning');
    }
  });

  ipcRenderer.on('discord:error', (event, errorData) => {
    isConnected = false;
    updateDiscordUI();
    updateDiscordModalUI();
    showDiscordNotification(errorData.message, 'error');
  });

  ipcRenderer.on('discord:status', (event, data) => {
    isConnected = data.connected;
    discordUser = data.user;
    updateDiscordUI();
    updateDiscordModalUI();
  });
}

/**
 * Update Discord button UI state
 */
function updateDiscordUI() {
  const discordButton = document.querySelector('.DiscordButton');
  if (!discordButton) {
    console.warn('Discord button not found in DOM');
    return;
  }

  if (isConnected) {
    discordButton.classList.add('connected');
    discordButton.title = 'Discord: Connected';
  } else {
    discordButton.classList.remove('connected');
    discordButton.title = 'Discord: Not Connected';
  }
}

/**
 * Update Discord modal UI state
 */
function updateDiscordModalUI() {
  const statusIndicator = document.getElementById('discordModalStatus');
  const userInfo = document.getElementById('discordModalUserInfo');
  const connectButton = document.getElementById('discordModalConnectBtn');

  if (!statusIndicator) {
    console.error('Discord modal status indicator not found in DOM');
    return;
  }

  if (!discordTranslations) {
    console.error('Discord translations not loaded');
    return;
  }

  const t = discordTranslations;

  if (isConnected && discordUser) {
    statusIndicator.className = 'discord-status connected';
    statusIndicator.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#43b581">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
      <span>${t.status_connected}</span>
    `;

    if (userInfo) {
      const avatarUrl = discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : 'https://cdn.discordapp.com/embed/avatars/0.png';

      userInfo.innerHTML = `
        <img src="${avatarUrl}" alt="Avatar" class="discord-avatar">
        <div class="discord-user-details">
          <span class="discord-username">${discordUser.username || 'Discord User'}</span>
        </div>
      `;
      userInfo.style.display = 'flex';
    }

    if (connectButton) {
      connectButton.textContent = t.disconnect_button;
      connectButton.classList.add('disconnect');
      connectButton.onclick = disconnectDiscord;
    }
  } else {
    statusIndicator.className = 'discord-status disconnected';
    statusIndicator.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#f04747">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      <span>${t.status_disconnected}</span>
    `;

    if (userInfo) {
      userInfo.style.display = 'none';
    }

    if (connectButton) {
      connectButton.textContent = t.connect_button;
      connectButton.classList.remove('disconnect');
      connectButton.onclick = connectDiscord;
    }
  }
}

/**
 * Open Discord modal
 */
function openDiscordModal() {
  const modal = document.getElementById('discordModal');
  if (!modal) {
    console.error('Discord modal not found in DOM');
    return;
  }

  modal.style.display = 'block';

  if (discordTranslations) {
    updateDiscordModalUI();
  } else {
    loadTranslations().then(() => {
      initializeDiscordModal();
      updateDiscordModalUI();
    });
  }

  if (typeof ipcRenderer !== 'undefined') {
    ipcRenderer.send('discord:get-status');
  }
}

/**
 * Close Discord modal
 */
function closeDiscordModal() {
  const modal = document.getElementById('discordModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * Connect to Discord
 */
function connectDiscord() {
  if (typeof ipcRenderer !== 'undefined') {
    ipcRenderer.send('discord:connect');
    if (discordTranslations) {
      showDiscordNotification(discordTranslations.status_connecting, 'info');
    }
  } else {
    console.error('ipcRenderer not available');
    showDiscordNotification('Discord integration is not available', 'error');
  }
}

/**
 * Disconnect from Discord
 */
function disconnectDiscord() {
  if (typeof ipcRenderer !== 'undefined') {
    ipcRenderer.send('discord:disconnect');
  } else {
    console.error('ipcRenderer not available');
  }
}

/**
 * Show notification toast
 */
function showDiscordNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `discord-notification ${type}`;

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  notification.innerHTML = `
    <span class="notification-icon">${icons[type] || icons.info}</span>
    <span class="notification-message">${message}</span>
  `;

  document.body.appendChild(notification);

  setTimeout(() => notification.classList.add('show'), 10);

  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Close modal on outside click
window.addEventListener('click', (event) => {
  const modal = document.getElementById('discordModal');
  if (event.target === modal) {
    closeDiscordModal();
  }
});

// Close modal on Escape key
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    const modal = document.getElementById('discordModal');
    if (modal && modal.style.display === 'block') {
      closeDiscordModal();
    }
  }
});
