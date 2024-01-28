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
        if (ev.key == 'Enter') {
            ipcRenderer.send('call-update-url', ev.target.value);
        }
    });

    input.addEventListener('input', (ev) => {
        ev.target.value = ev.target.value
            .replace('https://soundcloud.com/', '')
            .replace('http://soundcloud.com/', '')
            .replace('https://soundcloud.com', '')
            .replace('http://soundcloud.com', '')
            .split('?')[0];
    });
}

const Init = () => {
    const webview = document.querySelector('webview');

    ipcRenderer.on('load-url', (ev, url) => {
        UpdateUrlInPanel(url);
        try {
            if (webview.getAttribute('src') == 'https://soundcloud.com/' + url) {
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

    ipcRenderer.on('update-can-back', (ev, bool) => {
        const button = document.querySelector('#AppNavbarSystem .Locator .Back.button');
        if (bool) {
            if (button.classList.contains('block')) {
                button.classList.remove('block');
            }
        } else {
            if (!button.classList.contains('block')) {
                button.classList.add('block');
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
        document.querySelector('#AppNavbarSystem .Locator .Path input').value = url;
    } catch { }
}