import { marked } from '../../../node_modules/marked/lib/marked.esm.js';

// Configure marked for security
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false,
});

let updateInfo = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Get update info from query params or IPC
  if (typeof window.updateAPI !== 'undefined') {
    updateInfo = await window.updateAPI.getUpdateInfo();
    renderUpdateInfo(updateInfo);
  }

  setupEventListeners();
});

function renderUpdateInfo(info) {
  if (!info) return;

  // Set version number
  const versionEl = document.getElementById('versionNumber');
  if (versionEl) {
    versionEl.textContent = info.version || 'Unknown';
  }

  // Render changelog markdown
  const changelogEl = document.getElementById('changelogContent');
  if (changelogEl && info.changelog) {
    try {
      const container = document.querySelector('.changelog-container');

      const html = marked.parse(info.changelog);
      changelogEl.innerHTML = html;

      // Lock scroll at top - force it to stay there
      if (container) {
        // Keep forcing scroll to top for 500ms to override any auto-scroll
        const lockScrollTop = () => {
          container.scrollTop = 0;
        };

        // Immediate
        lockScrollTop();

        // Keep forcing for 500ms
        const interval = setInterval(lockScrollTop, 10);
        setTimeout(() => {
          clearInterval(interval);
        }, 500);
      }

      // Make links open in browser
      const links = changelogEl.querySelectorAll('a');
      for (const link of links) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          if (typeof window.updateAPI !== 'undefined') {
            window.updateAPI.openExternal(link.href);
          }
        });
      }
    } catch (error) {
      console.error('Failed to parse markdown:', error);
      changelogEl.innerHTML = `<pre>${escapeHtml(info.changelog)}</pre>`;
    }
  }
}

function setupEventListeners() {
  // Close button
  const closeBtn = document.getElementById('closeBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (typeof window.updateAPI !== 'undefined') {
        window.updateAPI.closeWindow();
      }
    });
  }

  // Later button
  const laterBtn = document.getElementById('laterBtn');
  if (laterBtn) {
    laterBtn.addEventListener('click', () => {
      if (typeof window.updateAPI !== 'undefined') {
        window.updateAPI.later();
      }
    });
  }

  // Install button
  const installBtn = document.getElementById('installBtn');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      installBtn.disabled = true;
      installBtn.textContent = 'Downloading...';

      if (typeof window.updateAPI !== 'undefined') {
        await window.updateAPI.install();
      }
    });
  }

  // Listen for download progress
  if (typeof window.updateAPI !== 'undefined') {
    window.updateAPI.onProgress((data) => {
      const installBtn = document.getElementById('installBtn');
      if (installBtn && data.percent !== undefined) {
        installBtn.textContent = `Downloading... ${data.percent}%`;
      }
    });
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
