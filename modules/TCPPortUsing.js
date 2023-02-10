const net = require('net');

module.exports = function (port, host) {
    return new Promise(resolve => {
        const client = new net.Socket();

        client.on('connect', () => CR(true));
        client.on('error', (err) => {
            if (err.code == 'ECONNREFUSED') CR(false);
            else CR(true);
        });

        client.connect(port, host, () => CR(true));

        let alr = false;
        function CR(bool) {
            cleanUp();
            if (alr) return;
            alr = true;
            resolve(bool);
        }

        function cleanUp() {
            if (client) {
                client.removeAllListeners('connect');
                client.removeAllListeners('error');
                client.removeAllListeners();
                client.end();
                client.destroy();
                client.unref();
            }
        }
    });
}