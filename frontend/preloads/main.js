const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ipcRenderer', {
  ...ipcRenderer,
  on: (name, event) => ipcRenderer.on(name, event),
  once: (name, event) => ipcRenderer.once(name, event),
  send: (name, ...args) => ipcRenderer.send(name, ...args),
  invoke: (name, ...args) => ipcRenderer.invoke(name, ...args),
});

contextBridge.exposeInMainWorld('settingsAPI', {
    getUIPreferences: () => ipcRenderer.invoke('settings:get-ui-preferences'),
});

const SetupHeader = () => {
  const input = document.querySelector('#AppNavbarSystem .Locator .Path input');

  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ipcRenderer.send('webview:navigate', encodeURI(ev.target.value));
    }
  });

  input.addEventListener('input', (ev) => {
    let decodeUrl = ev.target.value.replace(/(http|https)+(:\/\/)+(soundcloud\.com)+(\/?)/g, '');

    if (!decodeUrl.includes('search')) {
      decodeUrl = decodeUrl.split('?')[0];
    }

    ev.target.value = decodeURI(decodeUrl);
  });
};

const Init = () => {
  const webview = document.querySelector('webview');

  ipcRenderer.on('webview:navigate', (ev, url) => {
    const cleanUrl = url.replace(/https?:\/\/soundcloud\.com\/?/, '');
    UpdateUrlInPanel(cleanUrl);
    try {
      if (webview.getAttribute('src') === `https://soundcloud.com/${cleanUrl}`) {
        webview.setAttribute('src', 'https://soundcloud.com');
        setTimeout(() => {
          webview.setAttribute('src', `https://soundcloud.com/${cleanUrl}`);
        }, 100);
        return;
      }
    } catch {}
    webview.setAttribute('src', `https://soundcloud.com/${cleanUrl}`);
  });

  ipcRenderer.on('webview:url-changed', (ev, url) => {
    UpdateUrlInPanel(url);
  });

  ipcRenderer.on('webview:navigation-state-changed', (ev, canBack, canForward) => {
    const buttons = document.querySelector('#AppNavbarSystem .Locator');
    const backButton = buttons.querySelector('.Back.button');
    const forwardButton = buttons.querySelector('.Forward.button');

    if (canBack) {
      if (backButton.classList.contains('block')) {
        backButton.classList.remove('block');
      }
    } else {
      if (!backButton.classList.contains('block')) {
        backButton.classList.add('block');
      }
    }

    if (canForward) {
      if (forwardButton.classList.contains('block')) {
        forwardButton.classList.remove('block');
      }
    } else {
      if (!forwardButton.classList.contains('block')) {
        forwardButton.classList.add('block');
      }
    }
  });
};

window.addEventListener('DOMContentLoaded', () => {
  Init();
  SetupHeader();

  for (const type of ['chrome', 'node', 'electron']) {
    console.log(`${type}-version`, process.versions[type]);
  }
});

function UpdateUrlInPanel(url) {
  let cleanUrl = url;
  if (cleanUrl.startsWith('/')) {
    cleanUrl = cleanUrl.slice(1);
  }
  try {
    document.querySelector('#AppNavbarSystem .Locator .Path input').value = decodeURI(cleanUrl);
  } catch {}
}
