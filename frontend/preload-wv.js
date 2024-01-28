const { ipcRenderer } = require('electron');

let loadedCheck = false;

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
        console.log(type)
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

        if (lastUrlCache == href) {
            return;
        }
        if (href.replace('https://soundcloud.com').length < 2) {
            return;
        }
        if (href.startsWith('https://soundcloud.com/discover')) {
            return;
        }

        lastUrlCache = href;
        ipcRenderer.send('UpdateLastUrl', href);
        ipcRenderer.send('UpdateCanBack', (document.referrer != '' || history.length > 1));
    }, 200);
};

const addStyle = () => {
    const StyleId = 'BlackStyleDesktopApp';

    _add();

    setTimeout(() => {
        setInterval(() => {
            const _st = document.getElementById(StyleId);
            if (_st != null) {
                return;
            }

            _add();
        }, 2000);
    }, 10000);

    function _add() {
        const cssLink = document.createElement("link");
        cssLink.href = "scinner://styles/black-mode.css";
        cssLink.rel = "stylesheet";
        cssLink.type = "text/css";
        cssLink.id = StyleId;
        cssLink.onload = () => {
            loadedCheck = true;
        };
        document.head.appendChild(cssLink);
    }
};

window.addEventListener('DOMContentLoaded', () => {
    updateUrl();
    removeBanners();
    sendUpdatedUrl();
    addStyle();

    setTimeout(() => {
        loadedCheck = true;
    }, 7000);
});

document.addEventListener('mousedown', (e) => {
    if (e.button == 3) {
        history.back();
    }
    if (e.button == 4) {
        history.forward();
    }
});

(async () => {
    while (!loadedCheck) {
        try { document.body.style.display = 'none !important'; } catch { }
        await new Promise(resolve, setTimeout(() => resolve(), 100));
    }
    await new Promise(resolve, setTimeout(() => resolve(), 2000));
    try { document.body.style.display = ''; } catch { }
})();