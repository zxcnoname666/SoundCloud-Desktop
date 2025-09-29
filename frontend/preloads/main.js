const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ipcRenderer', {
  ...ipcRenderer,
  on: (name, event) => ipcRenderer.on(name, event),
  once: (name, event) => ipcRenderer.once(name, event),
  send: (name, ...args) => ipcRenderer.send(name, ...args),
  invoke: (name, ...args) => ipcRenderer.invoke(name, ...args),
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

const SetupSetting = () => {
  const settingsBlock = document.querySelector('.settings');
  const ResetStyles = () => {
    settingsBlock.style = '';
  };
  const ResetAnimations = () => {
    settingsBlock.style.animation = '';
  };
  const EventClick = () => {
    console.log(settingsBlock);
    console.log(settingsBlock.style.display === 'flex');
    console.log(settingsBlock.style.display);
    console.log(typeof settingsBlock.style.animation);

    if (settingsBlock.style.animation !== '') {
      return;
    }

    if (settingsBlock.style.display === 'flex') {
      settingsBlock.style.animation = 'slideDown 1s ease-in-out forwards';
      setTimeout(ResetStyles, 900);
    } else {
      settingsBlock.style = '';
      settingsBlock.style.display = 'flex';
      settingsBlock.style.animation = 'slideUp 1s ease-in-out forwards';
      setTimeout(ResetAnimations, 1000);
    }
  };

  document.querySelector('.LogoText img').addEventListener('click', EventClick);
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
  SetupSetting();

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
