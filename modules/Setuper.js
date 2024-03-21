const { BrowserWindow, Menu, app, ipcMain, shell, globalShortcut, protocol, net } = require('electron');
const path = require('path');
const fs = require('original-fs');
const url = require('url');

const LocalDBDir = path.join(app.getPath('appData'), 'SoundCloud', 'AppDB');

module.exports = class Setuper {
    static allWebContents = [];

    static cors(session) {
        session.webRequest.onBeforeSendHeaders({ urls: ["*://*/*"] },
            (details, callback) => {
                // ----- set user agent to legit browser -----
                details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.5993.89 Safari/537.36';
                // ----- end -----

                // ----- adblock -----
                const parsedUrl = new URL(details.url);

                if (parsedUrl.host == 'promoted.soundcloud.com'
                    || parsedUrl.host.endsWith('.adswizz.com')
                    || parsedUrl.host.endsWith('.adsrvr.org')
                    || parsedUrl.host.endsWith('.doubleclick.net')
                    || details.url.includes('audio-ads')) {
                    callback({ cancel: true });
                    return;
                }

                if (parsedUrl.host != 'soundcloud-upload.s3.amazonaws.com'
                    && !parsedUrl.host.endsWith('soundcloud.com')
                    && !parsedUrl.host.endsWith('sndcdn.com')

                    && !parsedUrl.host.endsWith('.captcha-delivery.com')
                    && !parsedUrl.host.endsWith('js.datadome.co')

                    && !parsedUrl.host.endsWith('google.com')
                    && !parsedUrl.host.endsWith('gstatic.com')
                    && parsedUrl.host != 'lh3.googleusercontent.com'

                    && !parsedUrl.host.endsWith('apple.com')
                    && !parsedUrl.host.endsWith('-ssl.mzstatic.com')
                ) {
                    callback({ cancel: true });
                    return;
                }
                // ----- adblock -----

                callback({ requestHeaders: details.requestHeaders });
            },
        );
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
                preload: path.join(__dirname, '../frontend/preload.js')
            },
            frame: false,
            titleBarStyle: 'hidden',
            backgroundColor: '#0D1117',
            title: 'SoundCloud',
            darkTheme: true,
        });

        ipcMain.on('navbarEvent', (ev, code) => {
            switch (code) {
                case 1: {
                    win.minimize();
                    break;
                }
                case 2: {
                    if (win.isMaximized()) {
                        win.unmaximize();
                    } else {
                        win.maximize();
                    }
                    break;
                }
                case 3: {
                    win.hide();
                    break;
                }
                default: {
                    break;
                }
            }
        });

        ipcMain.on('UpdateLastUrl', (ev, url) => {
            this.UpdateLastUrl(url);
            win.send('update-url', url.replace('https://soundcloud.com/', ''));
        });

        ipcMain.on('UpdateCanBack', (ev) => {
            const contents = ev.sender;
            win.send('update-can-back', contents.canGoBack(), contents.canGoForward());
        });

        ipcMain.on('call-update-url', (ev, url) => {
            this.UpdateLastUrl('https://soundcloud.com/' + url);

            this.EmitGlobalEvent('update-url', url);
        });

        ipcMain.on('call-wv', (ev, type) => {
            this.EmitGlobalEvent('call-wv-event', type);
        });

        protocol.handle('scinner', (request) => {
            switch (request.url.slice('scinner://'.length)) {
                case 'styles/black-mode.css':
                    return net.fetch(url.pathToFileURL(path.join(__dirname, '..', 'frontend', 'styles', 'black-mode.css')).toString());

                default:
                    break;
            }
        });

        return win;
    };

    static EmitGlobalEvent(event, ...args) {
        this.allWebContents.forEach(content => {
            if (content.isDestroyed()) {
                return;
            }

            content.send(event, ...args);
        });
    }

    static hookNewWindow(webContents) {
        this.allWebContents.push(webContents);

        webContents.setWindowOpenHandler(({ url }) => {
            if (url === 'about:blank') {
                return {
                    action: 'allow',
                    overrideBrowserWindowOptions: {
                        fullscreenable: false,
                        backgroundColor: '#0D1117',
                        icon: path.join(__dirname, '/../icons/appLogo.ico'),
                        darkTheme: true,
                        titleBarStyle: 'hidden',
                        titleBarOverlay: {
                            color: '#162a4c',
                            symbolColor: '#d17900',
                            height: 30
                        }
                    }
                }
            }
            console.log('blocked url: ' + url);
            shell.openExternal(url);
            return { action: 'deny' }
        });
    };

    static binds(win) {
        win.on('focus', () => {
            globalShortcut.register('CommandOrControl+R', async () => {
                win.send('load-url', await this.GetLastUrl());
            });
            globalShortcut.register('CommandOrControl+Shift+R', async () => {
                win.send('load-url', await this.GetLastUrl());
            });
        });

        win.on('blur', () => {
            globalShortcut.unregister('CommandOrControl+R');
            globalShortcut.unregister('CommandOrControl+Shift+R');
        });
    };

    static setupTasks() {
        const icoPath = path.join(app.getPath('temp'), 'sc-exit-view.ico');

        if (fs.existsSync(icoPath)) {
            fs.rmSync(icoPath, { recursive: true });
        }

        require('fs').copyFileSync(path.join(__dirname, '..', 'icons', 'exit.ico'), icoPath);

        if (process.platform == 'darwin') {
            const dockMenu = Menu.buildFromTemplate([
                {
                    label: 'Quit',
                    toolTip: 'Close the app',
                    icon: icoPath,
                    click() { app.exit(); }
                }
            ]);
            app.dock.setMenu(dockMenu);
            return;
        }

        if (process.platform == 'linux') {
            return;
        }

        if (process.platform.startsWith('win')) {
            app.setUserTasks([
                {
                    program: process.execPath,
                    arguments: '--close-all',
                    iconPath: icoPath,
                    iconIndex: 0,
                    title: 'Quit',
                    description: 'Close the app'
                }
            ]);
            return;
        }
    }

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
            if (url == '.') {
                url = process.argv[2];
            }
            if (!url) {
                url = '';
            }
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
        if (url == 'about:blank') {
            return;
        }
        if (!fs.existsSync(LocalDBDir)) {
            await fs.promises.mkdir(LocalDBDir, { recursive: true });
        }
        await fs.promises.writeFile(path.join(LocalDBDir, 'LastUrl'), url, 'utf-8');
    };

    static GetLastUrl() {
        return new Promise(async resolve => {
            if (!fs.existsSync(LocalDBDir)) {
                await fs.promises.mkdir(LocalDBDir, { recursive: true });
            }
            if (!fs.existsSync(path.join(LocalDBDir, 'LastUrl'))) {
                return resolve('');
            }

            fs.readFile(path.join(LocalDBDir, 'LastUrl'), 'utf-8', (err, _url) => {
                if (_url == undefined || _url == null) {
                    return resolve('');
                }

                resolve(_url.replace('https://soundcloud.com/', ''))
            });
        });
    };
}