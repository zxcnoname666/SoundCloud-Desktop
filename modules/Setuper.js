const { BrowserWindow, Menu, webContents, app, ipcMain, shell, globalShortcut, protocol, net, nativeTheme, dialog } = require('electron');
const path = require('path');
const fs = require('original-fs');
const fs_electron = require('fs');
const url = require('url');
const os = require('os');
const crypto = require("crypto");
const { pipeline } = require('node:stream');
const { promisify } = require('node:util');

const LocalDBDir = path.join(app.getPath('appData'), 'SoundCloud', 'AppDB');

const ProxyManager = require('./ProxyManager');
const Extensions = require('./Extensions');
const Version = require('./Version');

const GlobalUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

module.exports = class Setuper {
    static urlReplaceSymbols = {
        '?': '𖥍',
        '&': '𖠚',
    }

    static cors(session) {
        session.webRequest.onBeforeRequest({ urls: ["*://*/*"] },
            (details, callback) => {
                const proxyUrl = details.url.replaceAll('?', this.urlReplaceSymbols['?']).replaceAll('&', this.urlReplaceSymbols['&']);
                const parsedUrl = (() => {
                    let parsed = new URL(details.url);
                    if (parsed.search.includes('app_locale=pt_BR')) {
                        parsed = new URL(details.url.replaceAll('app_locale=pt_BR', 'app_locale=ru'));
                    }
                    return parsed;
                })();

                if (CheckAdBlock(parsedUrl)) {
                    callback({ cancel: true });
                    return;
                }

                if (parsedUrl.host == 'soundcloud.com' && parsedUrl.pathname.startsWith('/n/pages/standby')) {
                    callback({ cancel: true });
                    return;
                }

                if (parsedUrl.pathname.startsWith('/assets/locales/locale-pt-br')) {
                    callback({ redirectURL: 'scinner://lang/ru.js' });
                    return;
                }

                if (parsedUrl.host == 'api-v2.soundcloud.com') {
                    if (details.method != 'GET' && details.method != 'POST') {
                        callback({});
                        return;
                    }

                    if (parsedUrl.pathname.startsWith('/tracks') // [internal]
                        || parsedUrl.pathname.startsWith('/media/soundcloud:tracks') // [internal]
                        || parsedUrl.pathname.startsWith('/search') // search page
                        || parsedUrl.pathname.startsWith('/resolve') // track page
                        || parsedUrl.pathname.startsWith('/playlists') // playlist page
                        || (parsedUrl.pathname.startsWith('/users/') && parsedUrl.pathname.endsWith('/tracks')) // user page
                    ) {
                        callback({ redirectURL: 'scinner://proxy-tracks?url=' + encodeURI(proxyUrl) });
                        return;
                    }

                    callback({});
                    //callback({ redirectURL: 'scinner://proxy-basic?url=' + encodeURI(proxyUrl) });
                    return;
                }

                if (details.resourceType == 'script') {
                    callback({ redirectURL: 'scinner://scripts/load?url=' + encodeURI(proxyUrl) });
                    return;
                }

                callback({});
            },
        );

        session.webRequest.onBeforeSendHeaders({ urls: ["*://*/*"] },
            (details, callback) => {
                // ----- set user agent to legit browser -----
                details.requestHeaders['User-Agent'] = GlobalUserAgent;
                // ----- end -----

                // ----- adblock -----
                const parsedUrl = new URL(details.url);

                if (CheckAdBlock(parsedUrl)) {
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

        function CheckAdBlock(parsedUrl) {
            if (parsedUrl.host == 'promoted.soundcloud.com'
                || parsedUrl.host.endsWith('.adswizz.com')
                || parsedUrl.host.endsWith('.adsrvr.org')
                || parsedUrl.host.endsWith('.doubleclick.net')
                || parsedUrl.href.includes('audio-ads')) {
                return true;
            }
            return false;
        }
    }

    static create() {
        let win = new BrowserWindow({
            show: false,
            width: 1280,
            height: 720,
            icon: path.join(__dirname, '../icons/appLogo.ico'),
            webPreferences: {
                devTools: false,
                webviewTag: true,
                spellcheck: false,
                preload: path.join(__dirname, '../frontend/preload.js')
            },
            frame: false,
            titleBarStyle: 'hidden',
            backgroundColor: '#0D1117',
            title: 'SoundCloud',
            darkTheme: true,
        });

        nativeTheme.themeSource = 'dark';

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

        protocol.handle('scinner', async (request) => {
            switch (request.url.slice('scinner://'.length).split('?')[0]) {
                case 'styles/black-mode.css':
                    return net.fetch(url.pathToFileURL(path.join(__dirname, '..', 'frontend', 'styles', 'black-mode.css')).toString());

                case 'lang/ru.js':
                    return net.fetch(url.pathToFileURL(path.join(__dirname, '..', 'langs', 'ru.js')).toString());

                /*
                case 'proxy-login': {
                    const parsedUrl = new URL(request.url);
                    const requestedUrl = parsedUrl.searchParams.get('url').replaceAll(this.urlReplaceSymbols['?'], '?').replaceAll(this.urlReplaceSymbols['&'], '&');

                    if (!requestedUrl) {
                        return;
                    }

                    const jsonBody = await request.json();
                    jsonBody.vk.ag = GlobalUserAgent;

                    const resp = await fetch(requestedUrl, {
                        method: request.method,
                        mode: request.mode,
                        cache: request.cache,
                        credentials: request.credentials,
                        headers: request.headers,
                        integrity: request.integrity,
                        keepalive: request.keepalive,
                        redirect: request.redirect,
                        referrer: request.referrer,
                        referrerPolicy: request.referrerPolicy,
                        signal: request.signal,
                        body: jsonBody,
                    });
                    return resp;
                }
                */

                case 'scripts/load': {
                    const parsedUrl = new URL(request.url);
                    const requestedUrl = parsedUrl.searchParams.get('url').replaceAll(this.urlReplaceSymbols['?'], '?').replaceAll(this.urlReplaceSymbols['&'], '&');

                    if (!requestedUrl) {
                        return;
                    }

                    //const resp = await net.fetch(request, { bypassCustomProtocolHandlers: true });
                    const resp = await ProxyManager.sendRequest(requestedUrl, {
                        method: request.method,
                        mode: request.mode,
                        cache: request.cache,
                        credentials: request.credentials,
                        headers: request.headers,
                        integrity: request.integrity,
                        keepalive: request.keepalive,
                        redirect: request.redirect,
                        referrer: request.referrer,
                        referrerPolicy: request.referrerPolicy,
                        signal: request.signal,
                    });
                    let text = await resp.text();

                    text = text.replaceAll('Português (Brasil)', 'Русский').replaceAll('Português', 'Русский');

                    if (text.includes('mês')) {
                        text = require('../langs/ru_electron')(text);
                    }

                    return new Response(text, {
                        headers: resp.headers,
                        status: resp.status,
                        statusText: resp.statusText,
                    });
                }

                case 'proxy-basic': {
                    const parsedUrl = new URL(request.url);
                    const requestedUrl = parsedUrl.searchParams.get('url').replaceAll(this.urlReplaceSymbols['?'], '?').replaceAll(this.urlReplaceSymbols['&'], '&');

                    if (!requestedUrl) {
                        return;
                    }

                    let body = null;
                    if (request.method != 'GET' && request.method != 'HEAD') {
                        body = await request.text();
                    }

                    const resp = await ProxyManager.sendRequest(requestedUrl, {
                        method: request.method,
                        mode: request.mode,
                        cache: request.cache,
                        credentials: request.credentials,
                        headers: request.headers,
                        integrity: request.integrity,
                        keepalive: request.keepalive,
                        redirect: request.redirect,
                        referrer: request.referrer,
                        referrerPolicy: request.referrerPolicy,
                        signal: request.signal,
                        body: body,
                    });
                    let text = await resp.text();
                    return new Response(text, {
                        headers: resp.headers,
                        status: resp.status,
                        statusText: resp.statusText,
                    });
                }

                case 'proxy-tracks': {
                    const parsedUrl = new URL(request.url);
                    const requestedUrl = parsedUrl.searchParams.get('url').replaceAll(this.urlReplaceSymbols['?'], '?').replaceAll(this.urlReplaceSymbols['&'], '&');

                    if (!requestedUrl) {
                        return;
                    }

                    let body = null;
                    if (request.method != 'GET' && request.method != 'HEAD') {
                        body = await request.text();
                    }

                    const resp = await ProxyManager.sendRequest(requestedUrl, {
                        method: request.method,
                        mode: request.mode,
                        cache: request.cache,
                        credentials: request.credentials,
                        headers: request.headers,
                        integrity: request.integrity,
                        keepalive: request.keepalive,
                        redirect: request.redirect,
                        referrer: request.referrer,
                        referrerPolicy: request.referrerPolicy,
                        signal: request.signal,
                        body: body,
                    }, false, true);
                    let tracks = await resp.json();

                    if (Extensions.isArray(tracks)) {
                        let send = [];

                        tracks.forEach(track => {
                            track.policy = 'ALLOW';
                            send.push(track);
                        });

                        return new Response(JSON.stringify(send), {
                            headers: resp.headers,
                            status: resp.status,
                            statusText: resp.statusText,
                        });
                    }

                    if (typeof (tracks.policy) == 'string') {
                        tracks.policy = 'ALLOW';
                    }

                    if (Extensions.isArray(tracks.collection)) {
                        tracks.collection.forEach(collection => {
                            if (Extensions.isArray(collection.tracks)) {
                                collection.tracks.forEach(track => {
                                    track.policy = 'ALLOW';
                                    if (typeof (track.media) == 'object'
                                        && Extensions.isArray(track.media.transcodings)
                                        && track.media.transcodings.length == 0) {
                                        delete track.media;
                                    }
                                });
                            }
                        });
                    }

                    if (Extensions.isArray(tracks.tracks)) {
                        tracks.tracks.forEach(track => {
                            track.policy = 'ALLOW';
                            if (typeof (track.media) == 'object'
                                && Extensions.isArray(track.media.transcodings)
                                && track.media.transcodings.length == 0) {
                                delete track.media;
                            }
                        });
                    }

                    return new Response(JSON.stringify(tracks), {
                        headers: resp.headers,
                        status: resp.status,
                        statusText: resp.statusText,
                    });
                }

                default:
                    break;
            }
        });

        return win;
    }

    static EmitGlobalEvent(event, ...args) {
        webContents.getAllWebContents().forEach(content => {
            if (content.isDestroyed()) {
                return;
            }

            content.send(event, ...args);
        });
    }

    static hookNewWindow(webContents) {
        webContents.setUserAgent(GlobalUserAgent);

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
    }

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
    }

    static setupTasks() {
        const icoPath = path.join(app.getPath('temp'), 'sc-exit-view.ico');

        if (fs.existsSync(icoPath)) {
            fs.rmSync(icoPath, { recursive: true });
        }

        fs_electron.copyFileSync(path.join(__dirname, '..', 'icons', 'exit.ico'), icoPath);

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
    }

    static async autoUpdate() {
        const responce = await fetch('https://raw.githubusercontent.com/zxcnoname666/SoundCloud-Desktop/main/update_info.json');
        if (!responce.ok) {
            return;
        }
        const json = await responce.json();
        const translation = Extensions.translationsUpdater();

        const installedVersion = new Version(app.getVersion());
        const availableVersion = new Version(json.version);

        if (!availableVersion.isBiggest(installedVersion)) {
            return;
        }

        const dialogOpts = {
            type: 'info',
            buttons: [translation.install, translation.later],
            title: translation.title,
            message: 'v' + json.version,
            detail: translation.details
        }

        if (json.details) {
            dialogOpts.detail += '\n';
            dialogOpts.detail += translation.notes;
            dialogOpts.detail += '\n';
            dialogOpts.detail += json.details;
        }

        const returnValue = await dialog.showMessageBox(dialogOpts);

        if (returnValue.response != 0) {
            return;
        }

        const usedElectron = new Version(process.versions.electron);
        const availableElectron = new Version(json.electron);

        if (availableElectron.isBiggest(usedElectron)) {
            const resp = await fetch('https:' + '//github.com/zxcnoname666/SoundCloud-Desktop/releases/download/' + json.version + '/' + json.names.installer);

            if (!resp.ok) {
                await dialog.showMessageBox({
                    type: 'error',
                    title: 'Error',
                    message: translation.installation_error,
                    detail: resp.status + ' | ' + resp.statusText
                });
                return;
            }

            const temp_dir = fs.mkdtempSync(os.tmpdir + path.sep);
            const temp_file = path.join(temp_dir, json.names.installer);

            const streamPipeline = promisify(pipeline);
            await streamPipeline(resp.body, fs.createWriteStream(temp_file));

            const buff = fs.readFileSync(temp_file);
            const hash = crypto.createHash('sha256').update(buff).digest('hex');

            if (hash != json.hashes.installer) {
                await dialog.showMessageBox({
                    type: 'warning',
                    title: translation.missing_hash,
                    message: translation.missing_hash,
                    detail: translation.missing_hash_message
                });
                return;
            }

            shell.openExternal(temp_file);
            return;
        }

        {
            const resp = await fetch('https:' + '//github.com/zxcnoname666/SoundCloud-Desktop/releases/download/' + json.version + '/' + json.names.asar);

            if (!resp.ok) {
                await dialog.showMessageBox({
                    type: 'error',
                    title: 'Error',
                    message: translation.installation_error,
                    detail: resp.status + ' | ' + resp.statusText
                });
                return;
            }

            const temp_dir = fs.mkdtempSync(os.tmpdir + path.sep);
            const temp_file = path.join(temp_dir, json.names.asar);

            const streamPipeline = promisify(pipeline);
            await streamPipeline(resp.body, fs.createWriteStream(temp_file));

            const buff = fs.readFileSync(temp_file);
            const hash = crypto.createHash('sha256').update(buff).digest('hex');

            if (hash != json.hashes.asar) {
                await dialog.showMessageBox({
                    type: 'warning',
                    title: translation.missing_hash,
                    message: translation.missing_hash,
                    detail: translation.missing_hash_message
                });
                return;
            }

            const temp_renamer = path.join(temp_dir, 'sc-rename.exe');
            fs_electron.copyFileSync(path.join(__dirname, '..', 'bins', 'sc-rename.exe'), temp_renamer)

            app.relaunch({
                execPath: temp_renamer,
                args: [app.getAppPath(), temp_file, app.getPath('exe')]
            });
            app.exit(0);
        }
    }

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
    }

    static async getStartUrl() {
        const _url = this.getStartArgsUrl();
        if (_url.length > 1) {
            const postUrl = _url.replace('sc://', '');
            await this.UpdateLastUrl(postUrl);
            return postUrl;
        }
        return await this.GetLastUrl();
    }

    static async UpdateLastUrl(url) {
        if (url == 'about:blank') {
            return;
        }
        if (!fs.existsSync(LocalDBDir)) {
            await fs.promises.mkdir(LocalDBDir, { recursive: true });
        }
        await fs.promises.writeFile(path.join(LocalDBDir, 'LastUrl'), url, 'utf-8');
    }

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
    }
}