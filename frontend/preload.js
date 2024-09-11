const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ipcRenderer', {
    ...ipcRenderer,
    on: (name, event) => ipcRenderer.on(name, event),
    once: (name, event) => ipcRenderer.once(name, event),
    send: (name, ...args) => ipcRenderer.send(name, ...args),
});

const SetupHeader = () => {
    const input = document.querySelector('#AppNavbarSystem .Locator .Path input');

    input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
            ipcRenderer.send('call-update-url', encodeURI(ev.target.value));
        }
    });

    input.addEventListener('input', (ev) => {
        let decodeUrl = ev.target.value
            .replace('https://soundcloud.com/', '')
            .replace('http://soundcloud.com/', '')
            .replace('https://soundcloud.com', '')
            .replace('http://soundcloud.com', '');

        if (!decodeUrl.includes('search')) {
            decodeUrl = decodeUrl.split('?')[0];
        }

        ev.target.value = decodeURI(decodeUrl);
    });
}

const Init = () => {
    const webview = document.querySelector('webview');

    ipcRenderer.on('load-url', (ev, url) => {
        UpdateUrlInPanel(url);
        try {
            if (webview.getAttribute('src') === 'https://soundcloud.com/' + url) {
                webview.setAttribute('src', 'https://soundcloud.com');
                setTimeout(() => {
                    webview.setAttribute('src', 'https://soundcloud.com/' + url);
                }, 100);
                return;
            }
        } catch { }
        webview.setAttribute('src', 'https://soundcloud.com/' + url);
    });

    ipcRenderer.on('update-url', (ev, url) => {
        UpdateUrlInPanel(url);
    });

    ipcRenderer.on('update-can-back', (ev, canBack, canForward) => {
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
    if (url.startsWith('/')) {
        url = url.slice(1);
    }
    try {
        document.querySelector('#AppNavbarSystem .Locator .Path input').value = decodeURI(url);
    } catch { }
}