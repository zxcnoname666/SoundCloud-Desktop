const { app, ipcMain } = require('electron');

module.exports = {};

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