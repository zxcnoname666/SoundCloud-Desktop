// Authentication Modal JavaScript
let maskedToken = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeModal();
});

function initializeModal() {
  // Simple initialization - no browser checking needed
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
    showStatus('Please enter a token', 'error');
    return;
  }

  try {
    showStatus('Saving token...', 'info');

    // Send token to main process
    if (typeof ipcRenderer !== 'undefined') {
      const result = await ipcRenderer.invoke('save-auth-token', token);

      if (result.success) {
        // Mask the token for display
        maskedToken = '*'.repeat(token.length);
        tokenInput.value = maskedToken;
        tokenInput.type = 'text';

        showStatus('Token saved successfully! 🎉', 'success');

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
        showStatus(`Failed to save token: ${result.error}`, 'error');
      }
    } else {
      showStatus('Electron IPC not available', 'error');
    }
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
  }
}

function showStatus(message, type) {
  const statusDiv = document.getElementById('authStatus');

  if (!message) {
    statusDiv.style.display = 'none';
    statusDiv.className = 'auth-status';
    statusDiv.textContent = '';
    return;
  }

  statusDiv.style.display = 'block';
  statusDiv.className = `auth-status ${type}`;
  statusDiv.textContent = message;
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
