const { app, ipcMain } = require('electron');

module.exports = {};

module.exports.cors = (session) => {
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

module.exports.ipcmain = (win) => {
    ipcMain.on('navbarEvent', (event, code) => {
        if (code == 1) win.minimize();
        else if (code == 2) {
            if (win.isMaximized()) win.unmaximize();
            else win.maximize();
        }
        else if (code == 3) win.hide();
    });
};

module.exports.app = () => {
    try { app.commandLine.appendArgument("--disable-site-isolation-trials"); } catch { }
    try { app.commandLine.appendSwitch('disable-site-isolation-trials', true); } catch { }
    app.commandLine.appendSwitch('proxy-bypass-list', '<local>;*.scpsl.store;*.fydne.dev;*.githubusercontent.com;' +
        '*.google.com;*.gstatic.com;' +//google
        //'www.google.com;accounts.google.com;ssl.gstatic.com;'+//google
        'appleid.apple.com;iforgot.apple.com;www.apple.com;appleid.cdn-apple.com;is4-ssl.mzstatic.com');//apple
};