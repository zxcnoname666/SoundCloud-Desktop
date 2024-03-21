const electron = require('electron');
const { Notify } = require('notify-manager-electron');
const config = require('../config');

const { SocksProxyAgent } = require('socks-proxy-agent');
const HttpsProxyAgent = require('https-proxy-agent');
const nfetch = require('node-fetch');

const _localize = Intl.DateTimeFormat().resolvedOptions().locale;
const rulang = _localize.includes('ru') || _localize.includes('kk') || _localize.includes('ky') || _localize.includes('be');
const translations = (rulang ? config.translations.ru : (config.translations[_localize] ?? config.translations.en)) ?? {
    proxy_available_not_found: 'Available proxy servers not found',
    proxy_work_not_found: 'Working proxy servers not found',
    proxy_connected: 'Connected to proxy servers: [HIDDEN]',
};

module.exports = async (nmanager) => {
    const proxyList = config.proxy;

    if (proxyList.length == 0) {
        const notify = new Notify('SoundCloud', translations.proxy_available_not_found, 10, __dirname + '/../icons/appLogo.png');
        nmanager.show(notify);
        return;
    }

    let workProxies = [];
    for (let i = 0; i < proxyList.length; i++) {
        const proxy = ParseProxy(proxyList[i]);
        const _check = await ProxyCheck(proxy.source);
        if (_check) {
            workProxies.push(proxy);
        }
    }

    if (workProxies.length == 0) {
        const notify =  new Notify('SoundCloud', translations.proxy_work_not_found, 10);
        nmanager.show(notify);
        return;
    }

    electron.app.on('login', async (ev, webContents, req, authInfo, callback) => {
        if (!authInfo.isProxy) {
            return;
        }

        const proxy = workProxies.find(x => x.host == authInfo.host + ':' + authInfo.port && x.auth);
        if (!proxy) {
            return;
        }

        callback(proxy.login, proxy.password);
    });

    const bypass_proxy = (
        '<local>;' +
        '*.captcha-delivery.com;' + // captcha
        //'*.google.com;*.gstatic.com;' + //google
        'www.google.com;accounts.google.com;ssl.gstatic.com;fonts.gstatic.com;www.gstatic.com;lh3.googleusercontent.com;' + //google
        'appleid.apple.com;iforgot.apple.com;www.apple.com;appleid.cdn-apple.com;*-ssl.mzstatic.com;appleid.cdn-apple.com' //apple
    );

    const proxyCfg = {
        mode: 'fixed_servers',
        proxyBypassRules: bypass_proxy,
        proxyRules: '',
    };

    for (let i = 0; i < workProxies.length; i++) {
        const proxy = workProxies[i];
        proxyCfg.proxyRules += proxy.scheme + '://' + proxy.host;
        if (workProxies.length != i + 1) {
            proxyCfg.proxyRules += ',';
        }
    }

    await electron.session.defaultSession.setProxy(proxyCfg);
    await electron.session.defaultSession.closeAllConnections();

    electron.app.on('session-created', async(session) => {
        await session.setProxy(proxyCfg);
        await session.closeAllConnections();
    });

    const notify = new Notify('SoundCloud', '', 10, __dirname + '/../icons/data-server.png');
    notify.body = translations.proxy_connected.replaceAll('{ip}', proxyCfg.proxyRules.replaceAll(',', ', '));
    nmanager.show(notify);
    return;
};

function ParseProxy(proxy) {
    let json = {
        scheme: '',
        host: '',
        auth: false,
        login: '',
        password: '',
        source: proxy,
    }

    const parse1 = proxy.split('://');
    json.scheme = parse1[0];

    if (parse1.length < 2) {
        return (false, json);
    }

    const parse2 = parse1[1].split('@');

    if (parse2.length < 2) {
        json.host = parse2[0];
        return (true, json);
    }
    
    json.host = parse2[1];
    json.auth = true;

    const parse3 = parse2[0].split(':');

    if (parse3.length < 2) {
        parse3[1] = '';
    }

    json.login = parse3[0];
    json.password = parse3[1];

    return (true, json);
}

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

        let proxyJson = {};

        if (proxy.startsWith('http:') || proxy.startsWith('https:')) {
            proxyJson.agent = new HttpsProxyAgent(proxy);
        } else if (proxy.startsWith('socks')) {
            proxyJson.agent = new SocksProxyAgent(proxy);
        }

        nfetch('https://soundcloud.com', proxyJson)
            .then(() => {
                resolve(true);
                _sended = true;
            }).catch(() => {
                resolve(false);
                _sended = true;
            });
    });
}