const { ipcRenderer } = require('electron');

const updateUrl = () => {
    ipcRenderer.on('update-url-wv', (ev, url) => {
        url = 'https://soundcloud.com/' + url;
        history.pushState('SoundCloud', 'SoundCloud', url);
        setTimeout(() => {
            history.back();
            setTimeout(() => history.forward(), 100);
        }, 100);
    });
};
const removeBanners = () => {
    let _removed = false;
    setInterval(() => {
        const fel = document.getElementById('onetrust-consent-sdk');
        if (fel != null) {
            try { document.getElementById('onetrust-accept-btn-handler').click(); } catch { }
            setTimeout(() => fel.outerHTML = '', 100);
            _removed = true;
        }
    }, _removed ? 2000 : 100);
    setInterval(() => {
        const antipropaganda = document.getElementsByClassName('frontHero__logo');
        for (let i = 0; i < antipropaganda.length; i++) {
            const apr = antipropaganda[i];
            try { apr.title = ''; } catch { }
        }
    }, 2000);
};
const sendUpdatedUrl = () => {
    let lastUrlCache = '';
    setInterval(() => {
        const href = window.location.href;
        if(lastUrlCache == href) return;
        if(href.replace('https://soundcloud.com').length < 2) return;
        if(href.startsWith('https://soundcloud.com/discover')) return;
        lastUrlCache = href;
        ipcRenderer.send('UpdateLastUrl', href);
    }, 1000);
};
const addStyle = () => {
    const StyleId = 'BlackStyleDesktopApp';
    _add();
    setTimeout(() => {
        setInterval(() => {
            const _st = document.getElementById(StyleId);
            if (_st != null) return;
            _add();
        }, 2000);
    }, 10000);

    function _add() {
        const cssLink = document.createElement("link");
        cssLink.href = "https://raw.githubusercontent.com/fydne/SoundCloud-Desktop/frontend/styles/black-mode.css";
        cssLink.rel = "stylesheet";
        cssLink.type = "text/css";
        cssLink.id = StyleId;
        document.head.appendChild(cssLink);
    }
};

window.addEventListener('DOMContentLoaded', () => {
    updateUrl();
    removeBanners();
    sendUpdatedUrl();
    addStyle();
});

document.addEventListener('mousedown', (e) => {
    if (e.button == 3) history.back();
    if (e.button == 4) history.forward();
});