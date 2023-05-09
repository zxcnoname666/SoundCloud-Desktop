const { app, ipcMain } = require('electron');
const { Server } = require('qurre-socket');
const Setuper = require('./win-setup');

module.exports = (port, win) => {
    const server = new Server(port);
    server.on('connection', (socket) => {
        socket.on('OpenApp', () => win.show());
        socket.on('SetUrl', ([url]) => {
            url = url.replace('sc://', '');
            const _url = 'https://soundcloud.com/' + url;
            Setuper.UpdateLastUrl(_url);
            win.send('update-url', url);
            win.show();
        });
    });
    server.initialize();
};