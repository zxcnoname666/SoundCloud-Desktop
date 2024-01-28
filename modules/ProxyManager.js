const electron = require('electron');
const { Notify } = require('notify-manager-electron');
const HttpsProxyAgent = require('https-proxy-agent');
const nfetch = require('node-fetch');
const config = require('../config');

const _localize = Intl.DateTimeFormat().resolvedOptions().locale;
const rulang = _localize.includes('ru') || _localize.includes('kk') || _localize.includes('ky') || _localize.includes('be');
const translations = (rulang ? config.translations.ru : (config.translations[_localize] ?? config.translations.en)) ?? {
    proxy_available_not_found: 'Available proxy servers not found',
    proxy_work_not_found: 'Working proxy servers not found',
    proxy_connected: 'Connected to proxy server - [HIDDEN]',
};

module.exports = async (nmanager) => {
    const proxyList = config.proxy;

    if (proxyList.length == 0) {
        return new Notify('SoundCloud', translations.proxy_available_not_found, 10, __dirname + '/../icons/appLogo.png');
    }

    let proxy = '';
    for (let i = 0; proxy == '' && i < proxyList.length; i++) {
        const _proxy = proxyList[i];
        const _check = await ProxyCheck(_proxy);
        if (_check) {
            proxy = _proxy;
        }
    }

    if (proxy.length > 0) {
        electron.app.commandLine.appendSwitch('proxy-server', proxy);

        if (proxy.includes('@')) {
            const auth = proxy.split('@')[0]?.split(':') ?? ['', ''];
            electron.app.on('login', async (ev, webContents, req, authInfo, callback) => {
                if (authInfo.isProxy) {
                    callback(auth[0], auth[1]); // login, password
                }
            });
        }

        return new Notify('SoundCloud', translations.proxy_connected.replaceAll('{ip}', proxy), 10, __dirname + '/../icons/data-server.png');
    }

    return new Notify('SoundCloud', translations.proxy_work_not_found, 10);
};

function ProxyCheck(proxy) {
    return new Promise(async resolve => {
        let _sended = false;

        setTimeout(() => {
            if (_sended) {
                return;
            }

            resolve(false);
            _sended = true;
        }, 10000);

        const proxyAgent = new HttpsProxyAgent('http://' + proxy);
        nfetch('https://soundcloud.com', { agent: proxyAgent })
            .then(() => {
                resolve(true);
                _sended = true;
            }).catch(() => {
                resolve(false);
                _sended = true;
            });
    });
}