const electron = require('electron');
const {Server} = require('qurre-socket');
const Setuper = require('./Setuper');

module.exports = (port, win) => {
    const server = new Server(port);

    server.on('connection', (socket) => {
        socket.on('OpenApp', () => win.show());

        socket.on('CloseAll', () => {
            electron.app.exit();
        })

        socket.on('SetUrl', ([url]) => {
            url = url.replace('sc://', '');
            const _url = 'https://soundcloud.com/' + url;

            Setuper.UpdateLastUrl(_url);
            Setuper.EmitGlobalEvent('update-url', url);

            win.show();
        });
    });

    server.initialize();
};