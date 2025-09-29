const {ipcRenderer} = require('electron');

const updateUrl = () => {
    ipcRenderer.on('reload', () => {
    window.location.reload();
  });

    ipcRenderer.on('webview:navigate', (ev, url) => {
        const cleanUrl = `https://soundcloud.com/${url.replace(/https?:\/\/soundcloud\.com\/?/, '')}`;
        history.pushState('SoundCloud', 'SoundCloud', cleanUrl);
    setTimeout(() => {
      history.back();
      setTimeout(() => history.forward(), 100);
    }, 100);
  });

    ipcRenderer.on('webview:back', () => {
        history.back();
    });

    ipcRenderer.on('webview:forward', () => {
        history.forward();
    });

    ipcRenderer.on('webview:reload', () => {
        location.reload();
  });
};

const removeBanners = () => {
  let _removed = false;

    setInterval(
        () => {
            const fel = document.getElementById('onetrust-consent-sdk');
            if (fel != null) {
                try {
                    document.getElementById('onetrust-accept-btn-handler').click();
                } catch {
                }
                setTimeout(() => {
                    fel.outerHTML = '';
                }, 100);
                _removed = true;
            }
        },
        _removed ? 2000 : 100
    );

  setInterval(() => {
      const headerButton = document.querySelector('.header__logoLink, .frontHero__logo');
      headerButton.title = '';
  }, 3000);
};

const checkChromeError = () => {
  setInterval(() => {
    const url = new URL(window.location.href);

      if (url.pathname.startsWith('chrome-error') || url.protocol === 'chrome-error:') {
          window.location.href = 'https://soundcloud.com/';
    }
  }, 3000);
};

const sendUpdatedUrl = () => {
    let lastUrlCache = '';

  setInterval(() => {
    const href = window.location.href;

    if (lastUrlCache === href) {
      return;
    }

    lastUrlCache = href;
      ipcRenderer.send('webview:url-changed', href);
      ipcRenderer.send('webview:navigation-state-changed');
  }, 200);

    ipcRenderer.send('webview:navigation-state-changed');
};

const trackPlayingState = () => {
  setInterval(() => {
      const value = document.querySelector('.playControls__play').classList.contains('playing');
      ipcRenderer.send('app:set-playing', value);
  }, 1000);
};

window.addEventListener('DOMContentLoaded', () => {
  updateUrl();
  removeBanners();
  sendUpdatedUrl();
    trackPlayingState();
  checkChromeError();
});

document.addEventListener('mousedown', (e) => {
  if (e.button === 3) {
    history.back();
  }
  if (e.button === 4) {
    history.forward();
  }
});
