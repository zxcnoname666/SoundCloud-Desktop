const electron = require('electron');
const path = require('path');

module.exports = class CSPBypass {
    constructor(win) {
        this.window = win;
        win.loadURL(path.join('file://', __dirname, 'win.html'))
    }
    loadUrl(url, cb) {
        this.window.send('load-url', url)
        if (cb) electron.ipcMain.once('webview-invoke', cb);
    }
    static Create(win) {
        return new Promise(resolve => {
            const bps = new CSPBypass(win);
            win.webContents.once('did-finish-load', function () {
                resolve(bps);
            })
            win.webContents.once('did-fail-load', function (err) {
                resolve(bps);
            })
        });
    }
}