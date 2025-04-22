const {ipcRenderer} = require('electron');

const updateUrl = () => {
    ipcRenderer.on('update-url', (ev, url) => {
        url = 'https://soundcloud.com/' + url;
        history.pushState('SoundCloud', 'SoundCloud', url);
        setTimeout(() => {
            history.back();
            setTimeout(() => history.forward(), 100);
        }, 100);
    });

    ipcRenderer.on('call-wv-event', (ev, type) => {
        switch (type) {
            case 1: {
                history.back();
                break;
            }
            case 2: {
                history.forward();
                break;
            }
            case 3: {
                location.reload();
                break;
            }
            default: {
                break;
            }
        }
    });
};

const removeBanners = () => {
    let _removed = false;

    setInterval(() => {
        const fel = document.getElementById('onetrust-consent-sdk');
        if (fel != null) {
            try {
                document.getElementById('onetrust-accept-btn-handler').click();
            } catch {
            }
            setTimeout(() => fel.outerHTML = '', 100);
            _removed = true;
        }
    }, _removed ? 2000 : 100);

    setInterval(() => {
        const headerButton = document.querySelector('.header__logoLink, .frontHero__logo');
        headerButton.title = '';
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
        ipcRenderer.send('UpdateLastUrl', href);
        ipcRenderer.send('UpdateCanBack');
    }, 200);

    ipcRenderer.send('UpdateCanBack');
};

const UpdateIsPlaying = () => {
    setInterval(() => {
        const value = document.querySelector('.playControls__play').classList.contains('playing');
        ipcRenderer.send('UpdateIsPlaying', value);
    }, 1000);
};

window.addEventListener('DOMContentLoaded', () => {
    updateUrl();
    removeBanners();
    sendUpdatedUrl();
    UpdateIsPlaying();
});

document.addEventListener('mousedown', (e) => {
    if (e.button === 3) {
        history.back();
    }
    if (e.button === 4) {
        history.forward();
    }
});