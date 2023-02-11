const { app, BrowserWindow, globalShortcut, session, ipcMain } = require('electron');
const remote = require("@electron/remote/main");
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const CSPBypass = require('./CSPBypass/CSPBypass');
const appdata = require('appdata-path');
const HrefLoc = appdata.getAppDataPath("SoundCloud/AppBD");
const { Server, Client } = require('qurre-socket');
const tpu = require('./modules/TCPPortUsing');
const AutoUpdater = require('./modules/AutoUpdater');
const Setuper = require('./modules/win-setup');

let win;
const dev = false;
const AppPort = dev ? 3535 : 45828;

Setuper.app();

async function createWindow() {
    const _portUse = await PortUsing();
    if (_portUse) return;
    const updater = await AutoUpdater();
    await require('./modules/ProtocolInjector')();

    remote.initialize();
    win = new BrowserWindow({
        show: false,
        width: 1280,
        height: 720,
        icon: path.join(__dirname, '/icons/appLogo.png'),
        webPreferences: {
            devTools: false,
            sandbox: false,
            webviewTag: true,
            //webSecurity: false,
            nodeIntegration: true,
            nativeWindowOpen: true,
            contextIsolation: false,
            enableRemoteModule: true,
            //allowRunningInsecureContent: true,
            worldSafeExecuteJavaScript: false,
            preload: path.join(__dirname, 'CSPBypass/preload.js')
        },
        frame: false,
        titleBarStyle: 'hidden',
        backgroundColor: '#0D1117',
        title: 'SoundCloud',
        darkTheme: true,
    });
    remote.enable(win.webContents);

    require('./modules/startupMenu')(win);
    await require('./modules/ProxyManager')(win);

    const bypass = await CSPBypass.Create(win);
    win.once('ready-to-show', () => {
        win.show();
        try { updater.minimize(); } catch { }
        setTimeout(() => { try { updater.close(); } catch { } }, 1000);
    });
    win.on('close', (e) => {
        e.preventDefault();
        win?.hide();
    });

    Setuper.cors(win.webContents.session);
    Setuper.ipcmain(win);
    Setuper.hookNewWindow(win.webContents);
    Binds(win, bypass);

    const _server = new Server(AppPort);
    _server.on('connection', (socket) => {
        socket.on('OpenApp', () => win.show());
        socket.on('LastUrl', ([url]) => UpdateLastUrl(url));
        socket.on('SetUrl', ([url]) => {
            try { socket.emit('protocol.shutdown') } catch { }
            const _url = 'https://soundcloud.com/' + url.replace('sc://', '');
            _server.emit('app.changeurl', _url);
            win.show();
            UpdateLastUrl(_url);
        });
        socket.on('DiscordSCButtonClick', ([id]) => _server.emit('ClickSCButton', id));
        socket.on('discord.setRPC', ([val]) => ShowRPC = val);
    });
    const __portUse = await PortUsing();
    if (__portUse) return;
    await _server.initialize();

    const _timeUrl = GetUrlApp();
    if (_timeUrl.length > 1) {
        UpdateLastUrl(_timeUrl.replace('sc://', ''));
    }

    const _lastUrl = await GetLastUrl();
    bypass.loadUrl('https://soundcloud.com/' + _lastUrl, () => {
        try { Setuper.cors(session.fromPartition('persist:webviewsession')); } catch { }
    });
};

app.whenReady().then(() => {
    createWindow()
    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
});
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
});
app.on('web-contents-created', function (webContentsCreatedEvent, contents) {
    try { win.webContents.send('log', 'window created: ' + contents.getType()); } catch { }
    if (contents.getType() === 'webview') {
        Setuper.hookNewWindow(contents);
    }
});

async function PortUsing() {
    const _portUse = await tpu(AppPort, '127.0.0.1');
    if (_portUse) {
        setTimeout(() => app.quit(), 1000);
        const _client = new Client(AppPort);
        _client.emit('OpenApp');
        const url = GetUrlApp();
        if (url.length > 1) _client.emit('SetUrl', url);
    }
    return _portUse;
}

function GetUrlApp() {
    try {
        let url = process.argv[1];
        if (url == '.') url = process.argv[2];
        if (url == null || url == undefined) url = '';
        return url;
    } catch {
        return '';
    }
}

async function UpdateLastUrl(url) {
    if (url == 'about:blank') return;
    console.log(url);
    if (!fs.existsSync(HrefLoc)) await fs.promises.mkdir(HrefLoc, { recursive: true });
    fs.writeFile(path.join(HrefLoc, 'LastUrl'), url, 'utf-8', () => { });
}
function GetLastUrl() {
    return new Promise(async resolve => {
        if (!fs.existsSync(HrefLoc)) await fs.promises.mkdir(HrefLoc, { recursive: true });
        if (!fs.existsSync(path.join(HrefLoc, 'LastUrl'))) return resolve('');
        fs.readFile(path.join(HrefLoc, 'LastUrl'), 'utf-8', (err, _url) => {
            if (_url == undefined || _url == null) return resolve('');
            resolve(_url.replace('https://soundcloud.com/', ''))
        });
    });
}

function Binds(win, bypass) {
    win.on('focus', () => {
        globalShortcut.register('CommandOrControl+F', function () {
            if (win) win.send('on-find', '')
        });
        globalShortcut.register('CommandOrControl+R', async () => {
            const __lastUrl = await GetLastUrl();
            bypass.loadUrl('https://soundcloud.com/' + __lastUrl);
        });
        globalShortcut.register('CommandOrControl+Shift+R', async () => {
            const __lastUrl = await GetLastUrl();
            bypass.loadUrl('https://soundcloud.com/' + __lastUrl);
        });
    })
    win.on('blur', () => {
        globalShortcut.unregister('CommandOrControl+F');
        globalShortcut.unregister('CommandOrControl+R');
        globalShortcut.unregister('CommandOrControl+Shift+R');
    })
}