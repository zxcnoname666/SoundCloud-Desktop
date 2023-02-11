const Client = require('qurre-socket').Client;
const AppPort = 45828;
const _client = new Client(AppPort);

window.addEventListener('DOMContentLoaded', () => {
    _client.on('app.changeurl', ([url]) => {
        history.pushState('SoundCloud', 'SoundCloud', url);
        setTimeout(() => {
            history.back();
            setTimeout(() => history.forward(), 100);
        }, 100);
    });
    _client.on('ClickSCButton', ([id]) => {
        if (id == 1) document.getElementsByClassName('skipControl__previous')[0].click();
        else if (id == 2) document.getElementsByClassName('playControls__play')[0].click();
        else if (id == 3) document.getElementsByClassName('skipControl__next')[0].click();
    });
    let lastUrlCache = '';
    let cwd = false;
    setInterval(() => {
        const fel = document.getElementById('onetrust-consent-sdk');
        if (fel != null) {
            try { document.getElementById('onetrust-accept-btn-handler').click(); } catch { }
            setTimeout(() => fel.outerHTML = '', 100);
            cwd = true;
        }
        try {
            const href = window.location.href;
            if (href != 'https://soundcloud.com' && href != 'https://soundcloud.com/' && lastUrlCache != href &&
                href != 'https://soundcloud.com/discover' && href != 'https://soundcloud.com/discover/') {
                lastUrlCache = href;
                _client.emit('LastUrl', href);
            }
        } catch { }
    }, cwd ? 2000 : 100);
    const StyleId = 'BlackStyleDesktopApp';
    const ScriptId = 'RequestsJsHookerSCDA';

    AddStyle();
    setTimeout(() => {
        setInterval(() => {
            const _st = document.getElementById(StyleId);
            if (_st != null) return;
            AddStyle();
        }, 2000);
    }, 10000);

    AddScriptHook();
    setTimeout(() => {
        setInterval(() => {
            const _scr = document.getElementById(ScriptId);
            if (_scr != null) return;
            AddScriptHook();
        }, 2000);
    }, 10000);

    setInterval(() => {
        const antipropaganda = document.getElementsByClassName('header__logoLink');
        for (let i = 0; i < antipropaganda.length; i++) {
            const apr = antipropaganda[i];
            try { apr.title = ''; } catch { }
        }
    }, 2000);

    function AddStyle() {
        const cssLink = document.createElement("link");
        cssLink.href = "https://raw.githubusercontent.com/fydne/SoundCloud-Desktop/main/styles/scb.css";
        cssLink.rel = "stylesheet";
        cssLink.type = "text/css";
        cssLink.id = StyleId;
        document.head.appendChild(cssLink);
    }
    function AddScriptHook() {
        const script = document.createElement('script');
        script.src = 'https://raw.githubusercontent.com/fydne/SoundCloud-Desktop/main/CSPBypass/hook.js';
        script.id = ScriptId;
        document.head.appendChild(script);
    }
});

document.addEventListener('mousedown', (e) => {
    if (e.button == 3) history.back();
    if (e.button == 4) history.forward();
});

(() => {
    for (const type of ['chrome', 'node', 'electron']) {
        console.log(`${type}-version`, process.versions[type]);
    }
})();