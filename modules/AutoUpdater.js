const { BrowserWindow } = require('electron');
const path = require('path');

module.exports = async () => {
    const win = new BrowserWindow({
        show: true,
        width: 300,
        height: 400,
        icon: __dirname + "/../icons/appLogo.ico",
        webPreferences: { devTools: false },
        skipTaskbar: true,
        frame: false,
        titleBarStyle: 'hidden',
        backgroundColor: '#0D1117',
        title: 'SoundCloud Updater',
        darkTheme: true,
    });
    win.setResizable(false);
    await win.loadFile(path.join(path.join(__dirname, 'AutoUpdate'), 'render.html'));

    return win;
};