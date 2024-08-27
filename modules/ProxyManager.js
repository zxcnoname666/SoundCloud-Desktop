const electron = require('electron');
const { Notify } = require('notify-manager-electron');
const config = require('../config');

const { SocksProxyAgent } = require('socks-proxy-agent');
const HttpsProxyAgent = require('https-proxy-agent');
const nfetch = require('node-fetch');

const Extensions = require('./Extensions');

module.exports = class ProxyManager {
    static proxies = [];

    static async sendRequest(url, init, proxyAnyway = true, filterBest = false) {
        let last_resp = null;
        let proxiesFiltered = [...this.proxies];
        if (filterBest) {
            proxiesFiltered = proxiesFiltered.sort((a, b) => (a.bestBypass == b.bestBypass ? 0 : a.bestBypass ? -1 : 1));
        }
        /*
        console.log(proxiesFiltered);
        console.log(url + '  --  ' + filterBest);
        console.log('------');
        */

        for (let i = 0; i < proxiesFiltered.length; i++) {
            const proxy = proxiesFiltered[i];

            if (proxy.scheme.startsWith('http')) {
                init.agent = new HttpsProxyAgent(proxy.source);
            } else if (proxy.scheme.startsWith('socks')) {
                init.agent = new SocksProxyAgent(proxy.source);
            }

            const resp = await nfetch(url, init);
            last_resp = resp;
            if (parseInt(resp.status / 100) == 2) {
                let text = await resp.text();
                const new_resp = new Response(text, {
                    headers: resp.headers,
                    status: resp.status,
                    statusText: resp.statusText,
                });

                last_resp = new_resp;

                try {
                    let json = JSON.parse(text);
                    if (Extensions.isArray(json)) {
                        if (json.some(x => typeof (x.media) == 'object'
                            && Extensions.isArray(x.media.transcodings)
                            && x.media.transcodings.length == 0)) {
                            continue;
                        }
                    } else if (typeof (json.media) == 'object'
                        && Extensions.isArray(json.media.transcodings)
                        && json.media.transcodings.length == 0) {
                        continue;
                    }
                } catch { }

                return new_resp;
            }
        }

        if (proxyAnyway) {
            return last_resp;
        }

        {
            delete init.agent;
            const resp = await nfetch(url, init);
            return resp;
        }
    }

    static async Init(nmanager) {
        const translations = Extensions.translationsProxy();
        const proxyList = config.proxy;

        if (proxyList.length == 0) {
            const notify = new Notify('SoundCloud', translations.proxy_available_not_found, 10, __dirname + '/../icons/appLogo.png');
            nmanager.show(notify);
            return;
        }

        let workProxies = [];
        for (let i = 0; i < proxyList.length; i++) {
            const proxyConfig = proxyList[i];
            let proxy;

            if (typeof (proxyConfig) == 'string') {
                proxy = ParseProxy(proxyConfig);
            } else if (typeof (proxyConfig.url) == 'string') {
                proxy = ParseProxy(proxyConfig.url, (proxyConfig.bestBypass == true));

                if (typeof (proxyConfig.name) == 'string') {
                    proxy.name = proxyConfig.name;
                } else {
                    const urlName = new URL(proxyConfig.url);
                    proxy.name = urlName.hostname;
                }
            }

            const _check = await ProxyCheck(proxy.source);
            if (_check) {
                workProxies.push(proxy);
            }
        }

        if (workProxies.length == 0) {
            const notify = new Notify('SoundCloud', translations.proxy_work_not_found, 10);
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

        let bypass_proxy = (
            '<local>;' +
            //'*.google.com;*.gstatic.com;' + //google
            'www.google.com;accounts.google.com;ssl.gstatic.com;fonts.gstatic.com;www.gstatic.com;lh3.googleusercontent.com;' + //google
            'appleid.apple.com;iforgot.apple.com;www.apple.com;appleid.cdn-apple.com;*-ssl.mzstatic.com;appleid.cdn-apple.com' //apple
        );

        if (await CheckWorkCaptcha()) {
            bypass_proxy += ';*.captcha-delivery.com' // captcha
        }

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

        this.proxies.push(...workProxies);

        await electron.session.defaultSession.setProxy(proxyCfg);
        await electron.session.defaultSession.closeAllConnections();

        electron.app.on('session-created', async (session) => {
            await session.setProxy(proxyCfg);
            await session.closeAllConnections();
        });

        const notify = new Notify('SoundCloud', '', 10, __dirname + '/../icons/data-server.png');
        notify.body = translations.proxy_connected.replaceAll('{name}', '<br>' + workProxies.map(x => x.name).join(';<br>') + ';');
        nmanager.show(notify);
        return;
    };
}

function ParseProxy(proxy, best = false) {
    let json = {
        scheme: '',
        host: '',
        auth: false,
        login: '',
        password: '',
        source: proxy,
        bestBypass: best,
        name: '',
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
            .then(async(res) => {
                const content = await res.text();
                if (content.includes('The Squid Software') || !content.includes('meta content="SoundCloud"')) {
                    resolve(false);
                    _sended = true;
                    return;
                }
                resolve(true);
                _sended = true;
            }).catch(() => {
                resolve(false);
                _sended = true;
            });
    });
}

function CheckWorkCaptcha() {
    return new Promise(async resolve => {
        let _sended = false;

        setTimeout(() => {
            if (_sended) {
                return;
            }

            resolve(false);
            _sended = true;
        }, 5000);

        fetch('https://geo.captcha-delivery.com')
            .then(() => {
                resolve(true);
                _sended = true;
            }).catch(() => {
                resolve(false);
                _sended = true;
            });
    });
}