const { app, BrowserWindow } = require('electron');
const { NotifyManager } = require('notify-manager-electron');
const { Client } = require('qurre-socket');
const Setuper = require('./modules/Setuper');
const ProxyManager = require('./modules/ProxyManager');
const Extensions = require('./modules/Extensions');
const tpu = require('./modules/TCPPortUsing');

let win;
const dev = false;
const AppPort = dev ? 3535 : 45828;

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('web-contents-created', (ev, contents) => {
    try { console.log('window created: ' + contents.getType()); } catch { }

    setTimeout(() => {
        const interval = setInterval(() => {
            const value = enableIdle();
            if (value === 0) {
                clearInterval(interval);
            }
        }, 10000);
        enableIdle();
    }, 1000);

    Setuper.hookNewWindow(contents);
    Setuper.cors(contents.session);

    if (dev) {
        contents.openDevTools({ mode: 'detach' });
    }

    function enableIdle() {
        if (contents.isDestroyed()) {
            return 0;
        }

        const pid = contents.getOSProcessId();
        if (pid === 0) {
            return 1;
        }

        if (contents.getType() === 'webview' && Setuper.getIsPlaying()) {
            Extensions.setEfficiency(pid, false);
            return 1;
        }

        if (contents.getType() === 'window' && Setuper.getisActive()) {
            Extensions.setEfficiency(pid, false);
            return 1;
        }

        Extensions.setEfficiency(pid);
        return 1;
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
    if (_portUse) {
        setTimeout(() => app.quit(), 1000);
        return;
    }

    if (Setuper.getCloseAll()) {
        setTimeout(() => app.quit(), 1000);
        return;
    }

    app.configureHostResolver({
        secureDnsMode: 'secure',
        secureDnsServers: [
            'https://dns.quad9.net/dns-query',
            'https://dns9.quad9.net/dns-query',
            'https://cloudflare-dns.com/dns-query'
        ]
    });

    const loaderWin = await Setuper.loaderWin();
    const nmanager = new NotifyManager();

    await Setuper.autoUpdate();

    await ProxyManager.Init(nmanager);

    setTimeout(() => { try { nmanager.getWindow().destroy() } catch { } }, 15000);

    Setuper.setupTasks();

    Extensions.protocolInject();

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
    if (_portUse) {
        setTimeout(() => app.quit(), 1000);
        return;
    }

    require('./modules/Server')(AppPort, win);

    await win.loadFile(__dirname + '/frontend/main.html');
    win.send('load-url', await Setuper.getStartUrl());

    Extensions.sleeper.enable();
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

    if (Setuper.getCloseAll()) {
        _client.emit('CloseAll');
    }

    return true;
}