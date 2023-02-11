var electron = require('electron')
var domify = require('domify')
const { ipcRenderer } = require('electron');
const remote = require('@electron/remote');
const { FindInPage } = require('electron-find');

let webviewG;

window.addEventListener('keydown', (e) => {
    if (e.altKey && e.shiftKey && e.ctrlKey && e.keyCode == 81 /*Q*/) {
        webviewG.openDevTools();
    }
});

electron.ipcRenderer.on('load-url', function (event, url) {
    var webview = domify('<webview src="' + url + '" preload="./webview.js" nodeintegration webpreferences="nativeWindowOpen=true" ' +
        'allowpopups partition="persist:webviewsession"></webview>');
    document.body.innerHTML = '';
    document.body.appendChild(webview);
    webviewG = webview;
    webview.addEventListener('will-navigate', function (newUrl) {
        electron.ipcRenderer.send('webview-event', 'will-navigate', newUrl)
    })
    webview.addEventListener('did-finish-load', function () {
        electron.ipcRenderer.send('webview-event', 'did-finish-load')
        electron.ipcRenderer.send('webview-did-finish-load')
    })
    webview.addEventListener('did-fail-load', function (error) {
        electron.ipcRenderer.send('webview-event', 'did-fail-load', error)
        electron.ipcRenderer.send('webview-did-finish-load', error)
    })
    webview.addEventListener('did-start-loading', function () {
        electron.ipcRenderer.send('webview-event', 'did-start-loading')
    })
    webview.addEventListener('did-stop-loading', function () {
        electron.ipcRenderer.send('webview-event', 'did-stop-loading')
    })
    CreateBar();

    electron.ipcRenderer.send('webview-invoke');

    let findInPage = null;
    webview.addEventListener('dom-ready', () => {
        //webview.openDevTools();
        findInPage = new FindInPage(remote.webContents.fromId(webview.getWebContentsId()), {
            boxBgColor: '#333',
            boxShadowColor: '#000',
            inputColor: '#aaa',
            inputBgColor: '#222',
            inputFocusColor: '#555',
            textColor: '#aaa',
            textHoverBgColor: '#555',
            caseSelectedColor: '#555',
            offsetTop: 35,
            offsetRight: 50
        });
    })
    webview.addEventListener('close', () => {
        if (findInPage) {
            findInPage.destroy();
            findInPage = null;
        }
    })
    webview.addEventListener('destroyed', () => {
        if (findInPage) {
            findInPage.destroy();
            findInPage = null
        }
    })
    webview.addEventListener('crashed', () => {
        if (findInPage) {
            findInPage.destroy();
            findInPage = null;
        }
    })
    electron.ipcRenderer.on('on-find', (e, args) => {
        findInPage ? findInPage.openFindWindow() : ''
    })
});






function CreateBar() {
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

window.addEventListener('DOMContentLoaded', () => {
    CreateBar();
    for (const type of ['chrome', 'node', 'electron']) {
        console.log(`${type}-version`, process.versions[type]);
    }
});

(() => {
    ipcRenderer.on('log', (_, log) => {
        console.log(log);
    })
})()