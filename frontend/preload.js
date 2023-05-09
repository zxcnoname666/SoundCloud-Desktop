const { ipcRenderer } = require('electron');

const CreateBar = () => {
    const e1 = document.createElement('div');
    e1.id = 'AppNavbarSystem';
    document.getElementsByTagName('body')[0].appendChild(e1);
    const e2 = document.createElement('span');
    e2.className = 'LogoText';
    e2.innerHTML = 'SoundCloud';
    e1.appendChild(e2);
    const e3 = document.createElement('span');
    e3.className = 'ButtonsSelector';
    e1.appendChild(e3);
    {
        const e4 = document.createElement('div');
        e4.className = 'AppButon';
        e4.innerHTML = '<svg width="12" height="12" xmlns="http://www.w3.org/2000/svg"><g><line stroke-linecap="undefined" ' +
            'stroke-linejoin="undefined" id="svg_11" y2="5.9375" x2="12" y1="5.875" x1="0" stroke="#8c8c8c" fill="none"/></g></svg>';
        e4.addEventListener('click', () => ipcRenderer.send('navbarEvent', 1));
        e3.appendChild(e4);
    }
    {
        const e4 = document.createElement('div');
        e4.className = 'AppButon';
        e4.innerHTML = '<svg width="12" height="12" xmlns="http://www.w3.org/2000/svg"><g><line stroke="#8c8c8c" stroke-linecap=' +
            '"undefined" stroke-linejoin="undefined" id="svg_7" y2="11.99999" x2="0" y1="0" x1="0" fill="none"/><line stroke="#8c8c8c" ' +
            'stroke-linecap="undefined" stroke-linejoin="undefined" id="svg_8" y2="12" x2="12" y1="0" x1="12" fill="none"/><line stroke=' +
            '"#8c8c8c" stroke-linecap="undefined" stroke-linejoin="undefined" id="svg_9" y2="12" x2="11.9375" y1="12" x1="-0.0625" fill="none"/>' +
            '<line stroke="#8c8c8c" stroke-linecap="undefined" stroke-linejoin="undefined" id="svg_10" y2="0" x2="12" y1="0" x1="0" fill="none"/></g></svg>';
        e4.addEventListener('click', () => ipcRenderer.send('navbarEvent', 2));
        e3.appendChild(e4);
    }
    {
        const e4 = document.createElement('div');
        e4.className = 'AppButon';
        e4.innerHTML = '<svg width="12" height="12" xmlns="http://www.w3.org/2000/svg"><g><line stroke="#8c8c8c" stroke-linecap="undefined"' +
            ' stroke-linejoin="undefined" id="svg_4" y2="12.15625" x2="12.12499" y1="-0.15623" x1="0.00002" fill="none"/><line stroke="#8c8c8c"' +
            ' stroke-linecap="undefined" stroke-linejoin="undefined" id="svg_6" y2="0.03127" x2="12.12499" y1="12.09375" x1="0.00002" fill="none"/></g></svg>';
        e4.addEventListener('click', () => ipcRenderer.send('navbarEvent', 3));
        e3.appendChild(e4);
    }
};

const Init = () => {
    const webview = document.querySelector('webview');
    ipcRenderer.on('load-url', (ev, url) => {
        try{
            if(webview.getAttribute('src') == 'https://soundcloud.com/' + url){
                webview.setAttribute('src', 'https://soundcloud.com');
                setTimeout(() => {
                    webview.setAttribute('src', 'https://soundcloud.com/' + url);
                }, 100);
                return;
            }
        }catch{}
        webview.setAttribute('src', 'https://soundcloud.com/' + url);
    });
    ipcRenderer.on('update-url', (ev, url) => {
        webview.send('update-url-wv', url);
    });
};

window.addEventListener('DOMContentLoaded', () => {
    CreateBar();
    Init();
    for (const type of ['chrome', 'node', 'electron']) {
        console.log(`${type}-version`, process.versions[type]);
    }
});