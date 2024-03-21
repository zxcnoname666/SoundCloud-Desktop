const { app, BrowserWindow } = require('electron');
const { NotifyManager } = require('notify-manager-electron');
const { Client } = require('qurre-socket');
const Setuper = require('./modules/Setuper');
const tpu = require('./modules/TCPPortUsing');
const dontSleep = require('./modules/PreventSleep');

let win;
const dev = false;
const AppPort = dev ? 3535 : 45828;

app.on('window-all-closed', () => {
    if (process.platform != 'darwin') {
        app.quit();
    }
});

app.on('web-contents-created', (ev, contents) => {
    try { console.log('window created: ' + contents.getType()); } catch { }

    Setuper.hookNewWindow(contents);
    Setuper.cors(contents.session);

    if (dev) {
        contents.openDevTools({ mode: 'detach' });
    }
});

app.whenReady().then(() => {
    startup();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            startup();
        }
    });
});

async function startup() {
    let _portUse = await PortUsing();
    if (_portUse) return;

    const loaderWin = await Setuper.loaderWin();
    const nmanager = new NotifyManager();

    await require('./modules/ProxyManager')(nmanager);

    setTimeout(() => { try { nmanager.getWindow().destroy() } catch { } }, 15000);

    Setuper.setupTasks();

    require('./modules/ProtocolInjector')();

    win = Setuper.create();

    win.once('ready-to-show', () => {
        setTimeout(() => {
            win.show();
            try { loaderWin.close(); } catch { }
        }, 1000); // safe eyes from blink by chromium
    });
    win.on('close', (e) => {
        e.preventDefault();
        win?.hide();
    });

    require('./modules/startupMenu')(win);

    Setuper.cors(win.webContents.session);
    Setuper.binds(win);

    _portUse = await PortUsing();
    if (_portUse) return;

    require('./modules/Server')(AppPort, win);

    await win.loadFile(__dirname + '/frontend/main.html');
    win.send('load-url', await Setuper.getStartUrl());

    dontSleep.enable();
}

async function PortUsing() {
    const _portUse = await tpu(AppPort, '127.0.0.1');

    if (!_portUse) {
        return false;
    }

    setTimeout(() => app.quit(), 1000);

    const _client = new Client(AppPort);
    _client.emit('OpenApp');

    const url = Setuper.getStartArgsUrl();
    if (url.length > 1) {
        _client.emit('SetUrl', url);
    }

    return true;
}