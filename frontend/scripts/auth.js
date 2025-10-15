// Authentication Modal JavaScript
let maskedToken = null;
let translations = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    await loadTranslations();
    await initializeModal();

  // Listen for invalid token events from webview
  if (typeof ipcRenderer !== 'undefined') {
    ipcRenderer.on('auth:token-invalid', () => {
      openAuthModal();
        showStatus(translations.auth.auth_status_token_invalid, 'error');
    });
  }
});

async function loadTranslations() {
    try {
        if (typeof ipcRenderer !== 'undefined') {
            const t = await ipcRenderer.invoke('app:get-translations');
            translations = t;
        }
    } catch (error) {
        console.error('Failed to load translations:', error);
        // Use English as fallback
        translations = {
            auth: {
                auth_modal_title: '🎵 SoundCloud Authentication',
                auth_token_title: '🔑 Enter Your Authentication Token',
                auth_token_description:
                    'Follow the guide below to extract your SoundCloud authentication token:',
                auth_token_placeholder: 'Paste your oauth_token here...',
                auth_save_button: 'Save Token',
                auth_guide_title: '📋 How to get your SoundCloud token:',
                auth_guide_step1_title: 'Open SoundCloud in your browser',
                auth_guide_step1_desc: "Go to soundcloud.com and make sure you're logged in",
                auth_guide_step2_title: 'Open Developer Tools',
                auth_guide_step2_desc: 'Press F12 or Ctrl+Shift+I (Windows/Linux) or Cmd+Option+I (Mac)',
                auth_guide_step3_title: 'Go to Application/Storage tab',
                auth_guide_step3_desc:
                    'Click on "Application" tab (Chrome/Edge) or "Storage" tab (Firefox)',
                auth_guide_step4_title: 'Find Cookies',
                auth_guide_step4_desc: 'Expand "Cookies" → "https://soundcloud.com"',
                auth_guide_step5_title: 'Copy oauth_token',
                auth_guide_step5_desc: 'Find cookie named oauth_token and copy its Value',
                auth_guide_step6_title: 'Paste and Save',
                auth_guide_step6_desc: 'Paste the token value above and click "Save Token"',
                auth_guide_warning:
                    "⚠️ Important: Your token is like a password - keep it secure and don't share it with others!",
                auth_status_token_invalid:
                    'Your authentication token was invalid and has been cleared. Please enter a valid token.',
                auth_status_enter_token: 'Please enter a token',
                auth_status_saving: 'Saving token...',
                auth_status_saved: 'Token saved successfully! 🎉',
                auth_status_failed: 'Failed to save token: {error}',
                auth_status_ipc_unavailable: 'Electron IPC not available',
            },
        };
    }
}

async function initializeModal() {
    // Update UI with translations
    if (!translations) return;

    const t = translations.auth;

    document.querySelector('.auth-modal-header h2').textContent = t.auth_modal_title;
    document.querySelector('.auth-section h3').textContent = t.auth_token_title;
    document.querySelector('.auth-section p').textContent = t.auth_token_description;
    document.querySelector('#tokenInput').placeholder = t.auth_token_placeholder;
    document.querySelector('.auth-button.primary').textContent = t.auth_save_button;
    document.querySelector('.auth-guide h4').textContent = t.auth_guide_title;

    const steps = document.querySelectorAll('.guide-step');
    const stepTranslations = [
        {title: t.auth_guide_step1_title, desc: t.auth_guide_step1_desc},
        {title: t.auth_guide_step2_title, desc: t.auth_guide_step2_desc},
        {title: t.auth_guide_step3_title, desc: t.auth_guide_step3_desc},
        {title: t.auth_guide_step4_title, desc: t.auth_guide_step4_desc},
        {title: t.auth_guide_step5_title, desc: t.auth_guide_step5_desc},
        {title: t.auth_guide_step6_title, desc: t.auth_guide_step6_desc},
    ];

    steps.forEach((step, index) => {
        const translation = stepTranslations[index];
        if (translation) {
            step.querySelector('.step-content strong').textContent = translation.title;
            step.querySelector('.step-content p').innerHTML = translation.desc;
        }
    });

    document.querySelector('.guide-note').innerHTML = `<strong>${t.auth_guide_warning}</strong>`;
}

function openAuthModal() {
  const modal = document.getElementById('authModal');
  modal.style.display = 'block';
}

function closeAuthModal() {
  const modal = document.getElementById('authModal');
  modal.style.display = 'none';

  // Clear status
  showStatus('', '');

  // Reset form
  document.getElementById('tokenInput').value = '';
}

async function saveToken() {
  const tokenInput = document.getElementById('tokenInput');
  const token = tokenInput.value.trim();

  if (!token) {
      showStatus(translations.auth.auth_status_enter_token, 'error');
    return;
  }

  try {
      showStatus(translations.auth.auth_status_saving, 'info');

    // Send token to main process
    if (typeof ipcRenderer !== 'undefined') {
      const result = await ipcRenderer.invoke('save-auth-token', token);

      if (result.success) {
        // Mask the token for display
        maskedToken = '*'.repeat(token.length);
        tokenInput.value = maskedToken;
        tokenInput.type = 'text';

          showStatus(translations.auth.auth_status_saved, 'success');

        // Reload webview to apply new authentication
        const webview = document.querySelector('webview');
        if (webview) {
          webview.reload();
        }

        // Close modal after 2 seconds
        setTimeout(() => {
          closeAuthModal();
        }, 2000);
      } else {
          showStatus(translations.auth.auth_status_failed.replace('{error}', result.error), 'error');
      }
    } else {
        showStatus(translations.auth.auth_status_ipc_unavailable, 'error');
    }
  } catch (error) {
      showStatus(translations.auth.auth_status_failed.replace('{error}', error.message), 'error');
  }
}

function showStatus(message, type) {
  const statusDiv = document.getElementById('authStatus');

  if (!message) {
    statusDiv.style.display = 'none';
    statusDiv.className = 'auth-status';
    statusDiv.innerHTML = '';
    return;
  }

  // Determine icon based on type
  let icon = '🔔';
  if (type === 'success') icon = '✨';
  else if (type === 'error') icon = '⚠️';
  else if (type === 'info') icon = 'ℹ️';

  statusDiv.style.display = 'block';
  statusDiv.className = `auth-status ${type}`;
  statusDiv.innerHTML = `
    <div class="auth-status-content">
      <div class="auth-status-icon">${icon}</div>
      <div class="auth-status-text">${message}</div>
    </div>
  `;
}

// Close modal when clicking outside of it
window.addEventListener('click', (event) => {
  const modal = document.getElementById('authModal');
  if (event.target === modal) {
    closeAuthModal();
  }
});

// Handle Enter key in token input
document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    const tokenInput = document.getElementById('tokenInput');
    if (document.activeElement === tokenInput) {
      saveToken();
    }
  }

  // Handle Escape key to close modal
  if (event.key === 'Escape') {
    const modal = document.getElementById('authModal');
    if (modal.style.display === 'block') {
      closeAuthModal();
    }
  }
});
