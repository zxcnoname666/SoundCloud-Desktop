const { BrowserWindow, app, ipcMain, shell, globalShortcut } = require('electron');
const path = require('path');
const fs = require('original-fs');
const appdata = require('appdata-path');

const LocalDBDir = appdata.getAppDataPath('SoundCloud/AppBD');

module.exports = class Setuper {
    static cors(session) {
        session.webRequest.onBeforeSendHeaders({ urls: ["https://raw.githubusercontent.com/fydne/*"] },
            (details, callback) => {
                const { requestHeaders } = details;
                UpsertKeyValue(requestHeaders, 'Access-Control-Allow-Origin', '*');
                UpsertKeyValue(requestHeaders, 'Sec-Fetch-Mode', 'no-cors');
                UpsertKeyValue(requestHeaders, 'Sec-Fetch-Site', 'none');
                callback({ requestHeaders });
            },
        );
    
        session.webRequest.onHeadersReceived({ urls: ["*://raw.githubusercontent.com/fydne/*"] },
            (details, callback) => {
                const { responseHeaders } = details;
                if (details.url.endsWith('.css')) {
                    UpsertKeyValue(responseHeaders, 'content-type', ['text/css; charset=UTF-8']);
                }
                else if (details.url.endsWith('.js')) {
                    UpsertKeyValue(responseHeaders, 'content-type', ['application/javascript; charset=UTF-8']);
                }
                callback({
                    responseHeaders,
                });
            }
        );
    
        function UpsertKeyValue(obj, keyToChange, value) {
            const keyToChangeLower = keyToChange.toLowerCase();
            for (const key of Object.keys(obj)) {
                if (key.toLowerCase() == keyToChangeLower) {
                    obj[key] = value;
                    return;
                }
            }
            obj[keyToChange] = value;
        }
    };

    static create() {
        let win = new BrowserWindow({
            show: false,
            width: 1280,
            height: 720,
            icon: path.join(__dirname, '../icons/appLogo.ico'),
            webPreferences: {
                devTools: false,
                webviewTag: true,
                contextIsolation: false,//*
                preload: path.join(__dirname, '../frontend/preload.js')
            },
            frame: false,
            titleBarStyle: 'hidden',
            backgroundColor: '#0D1117',
            title: 'SoundCloud',
            darkTheme: true,
        });
    
        ipcMain.on('navbarEvent', (ev, code) => {
            if (code == 1) win.minimize();
            else if (code == 2) {
                if (win.isMaximized()) win.unmaximize();
                else win.maximize();
            }
            else if (code == 3) win.hide();
        });
    
        ipcMain.on('UpdateLastUrl', (ev, url) => {
            this.UpdateLastUrl(url);
        });
    
        return win;
    };

    static hookNewWindow(webContents) {
        webContents.setWindowOpenHandler(({ url }) => {
            if (url === 'about:blank') {
                return {
                    action: 'allow',
                    overrideBrowserWindowOptions: {
                        fullscreenable: false,
                        backgroundColor: '#0D1117',
                        icon: path.join(__dirname, '/../icons/appLogo.ico'),
                        darkTheme: true,
                    }
                }
            }
            console.log('blocked url: ' + url);
            shell.openExternal(url);
            return { action: 'deny' }
        })
    };

    static app() {
        app.commandLine.appendSwitch('proxy-bypass-list', '<local>;*.githubusercontent.com;' +
            '*.google.com;*.gstatic.com;' +//google
            //'www.google.com;accounts.google.com;ssl.gstatic.com;'+//google
            'appleid.apple.com;iforgot.apple.com;www.apple.com;appleid.cdn-apple.com;is4-ssl.mzstatic.com');//apple
    };

    static binds(win) {
        win.on('focus', () => {
            globalShortcut.register('CommandOrControl+R', async () => {
                const __lastUrl = await this.GetLastUrl();
                win.send('load-url', __lastUrl);
            });
            globalShortcut.register('CommandOrControl+Shift+R', async () => {
                const __lastUrl = await this.GetLastUrl();
                win.send('load-url', __lastUrl);
            });
        });
        win.on('blur', () => {
            globalShortcut.unregister('CommandOrControl+R');
            globalShortcut.unregister('CommandOrControl+Shift+R');
        });
    };

    static async loaderWin() {
        const win = new BrowserWindow({
            show: true,
            width: 300,
            height: 400,
            icon: path.join(__dirname + '../../icons/appLogo.ico'),
            webPreferences: { devTools: false },
            skipTaskbar: true,
            frame: false,
            titleBarStyle: 'hidden',
            backgroundColor: '#0D1117',
            title: 'SoundCloud Loader',
            darkTheme: true,
        });
        
        win.setResizable(false);
        await win.loadFile(path.join(__dirname, '..', 'frontend', 'AppLoader', 'render.html'));
    
        return win;
    };

    static getStartArgsUrl() {
        try {
            let url = process.argv[1];
            if (url == '.') url = process.argv[2];
            if (!url) url = '';
            return url;
        } catch {
            return '';
        }
    };

    static async getStartUrl() {
        const _url = this.getStartArgsUrl();
        if (_url.length > 1) {
            const postUrl = _url.replace('sc://', '');
            await this.UpdateLastUrl(postUrl);
            return postUrl;
        }
        return await this.GetLastUrl();
    };

    static async UpdateLastUrl(url) {
        if (url == 'about:blank') return;
        if (!fs.existsSync(LocalDBDir)) await fs.promises.mkdir(LocalDBDir, {recursive: true});
        await fs.promises.writeFile(path.join(LocalDBDir, 'LastUrl'), url, 'utf-8');
    };

    static GetLastUrl() {
        return new Promise(async resolve => {
            if (!fs.existsSync(LocalDBDir)) await fs.promises.mkdir(LocalDBDir, {recursive: true});
            if (!fs.existsSync(path.join(LocalDBDir, 'LastUrl'))) return resolve('');
            fs.readFile(path.join(LocalDBDir, 'LastUrl'), 'utf-8', (err, _url) => {
                if (_url == undefined || _url == null) return resolve('');
                resolve(_url.replace('https://soundcloud.com/', ''))
            });
        });
    };
}