const electron = require('electron');
const {Notify} = require('notify-manager-electron');
const config = require('../config');

const {SocksProxyAgent} = require('socks-proxy-agent');
const HttpsProxyAgent = require('https-proxy-agent');
const nfetch = require('node-fetch');
const tls = require('node:tls');

const Extensions = require('./Extensions');
const {webContents, net} = require("electron");
const url = require("url");
const path = require("path");

module.exports = class ProxyManager {
    static proxies = [];
    static failedChecks = 0;
    static previosCount = 0;

    static async sendRequest(url, init = {}, proxyAnyway = true, filterBest = false) {
        const controllers = [];

        // ---------- helpers ----------
        const agentFor = (proxy) => {
            if (proxy.scheme.startsWith('http')) {
                return new HttpsProxyAgent(proxy.source);
            }
            if (proxy.scheme.startsWith('socks')) {
                return new SocksProxyAgent(proxy.source);
            }
            throw new Error(`Unknown proxy scheme: ${proxy.scheme}`);
        };

        const isSoundCloudInvalid = (json) => {
            if (!json) return false;
            const check = (item) =>
                typeof item.media === 'object' &&
                Array.isArray(item.media.transcodings) &&
                item.media.transcodings.length === 0;

            if (Array.isArray(json)) {
                return json.some(check);
            }
            return check(json);
        };

        const madeRequest = async(opts) => {
            const controller = new AbortController();
            const obj = {
                success: false,
                abort: controller,
            }
            controllers.push(obj);

            const resp = await nfetch(url, {
                ...opts,
                signal: controller.signal
            });

            if (!resp.ok) {
                throw resp;// network/HTTP failure
            }

            const contentType = resp.headers.get('content-type');
            if (!contentType || !contentType.includes('json')) {
                obj.success = true;
                return resp;
            }

            // --- SoundCloud edge case: weed out empty “media.transcodings” ---
            let text;

            try {
                text = await resp.text();
            } catch {
                obj.success = true;
                return resp;
            }
            const newResp = new Response(text, {
                headers: resp.headers,
                status: resp.status,
                statusText: resp.statusText,
            });

            if (!url.includes('api.soundcloud.com/')) {
                return newResp; // anything except SC API is fine
            }

            let json;
            try {
                json = JSON.parse(text);
            } catch {
                /* JSON parse failed – treat as valid */
            }

            if (json) {
                if (isSoundCloudInvalid(json)) {
                    throw newResp; // reject – let the race continue
                }
            }

            return newResp;
        }

        // ---------- sort proxies if requested ----------
        let proxiesFiltered = [...this.proxies];
        if (filterBest) {
            proxiesFiltered.sort((a, b) =>
                a.bestBypass === b.bestBypass ? 0 : a.bestBypass ? -1 : 1
            );
        }

        // ---------- fire all proxy requests concurrently ----------
        const proxyPromises = proxiesFiltered.map((proxy) => madeRequest({ ...init, agent: agentFor(proxy) }));
        proxyPromises.push(madeRequest({ ...init }));

        const abortAll = () => controllers.forEach((c) => {if (!c.success) c.abort.abort()});

        try {
            // Promise.any resolves with the FIRST fulfilment.
            // If every promise rejects, an AggregateError is thrown.
            const promise = await Promise.any(proxyPromises);
            console.log(controllers.filter(x => x.success).length);
            abortAll();
            return promise;
        } catch (aggregate) {
            // Все прокси отвалились — abort pending fetches
            abortAll();
            if (aggregate && aggregate.errors) {
                let err = aggregate.errors.reverse().find((e) => e instanceof Response) ?? null;
                if (err != null) return err;
            }
        }

        return net.fetch(url, init);
    }

    static async Init(nmanager) {
        tls.DEFAULT_MAX_VERSION = 'TLSv1.2';

        const translations = Extensions.translationsProxy();
        const proxyList = config.proxy;

        if (proxyList.length === 0) {
            const notify = new Notify('SoundCloud', translations.proxy_available_not_found, 10, __dirname + '/../icons/appLogo.png');
            nmanager.show(notify);
            return;
        }

        let workProxies = [];
        let allProxies = [];
        for (let i = 0; i < proxyList.length; i++) {
            const proxyConfig = proxyList[i];
            let proxy;

            if (typeof (proxyConfig) == 'string') {
                proxy = ParseProxy(proxyConfig);
            } else if (typeof (proxyConfig.url) == 'string') {
                proxy = ParseProxy(proxyConfig.url, (proxyConfig.bestBypass === true), (proxyConfig.dontCheck === true));

                if (typeof (proxyConfig.name) == 'string') {
                    proxy.name = proxyConfig.name;
                } else {
                    const urlName = new URL(proxyConfig.url);
                    proxy.name = urlName.hostname;
                }
            }

            allProxies.push(proxy);
            const _check = proxy.dontCheck ?? await ProxyCheck(proxy.source);
            if (_check) {
                workProxies.push(proxy);
            }
        }

        electron.app.on('login', async (ev, webContents, req, authInfo, callback) => {
            if (!authInfo.isProxy) {
                return;
            }

            const proxy = allProxies.find(x => x.host === authInfo.host + ':' + authInfo.port && x.auth);
            if (!proxy) {
                return;
            }

            callback(proxy.login, proxy.password);
        });

        let bypass_proxy = (
            '<local>;cloudflare-dns.com;' +
            //'*.google.com;*.gstatic.com;' + //google
            'www.google.com;accounts.google.com;ssl.gstatic.com;fonts.gstatic.com;www.gstatic.com;lh3.googleusercontent.com;' + //google
            'appleid.apple.com;iforgot.apple.com;www.apple.com;appleid.cdn-apple.com;*-ssl.mzstatic.com;appleid.cdn-apple.com' //apple
        );

        // if (await CheckWorkDomain('https://geo.captcha-delivery.com')) {
        //     bypass_proxy += ';*.captcha-delivery.com' // captcha
        // }
        //
        // if (await CheckWorkDomain('https://api-auth.soundcloud.com/')) {
        //     bypass_proxy += ';api-auth.soundcloud.com' // api auth
        // }
        //
        // if (await CheckWorkDomain('https://api.soundcloud.com/')) {
        //     bypass_proxy += ';api.soundcloud.com' // api
        // }

        const proxyCfg = {
            mode: 'fixed_servers',
            proxyBypassRules: bypass_proxy,
            proxyRules: '',
        };

        for (let i = 0; i < workProxies.length; i++) {
            const proxy = workProxies[i];
            proxyCfg.proxyRules += proxy.scheme + '://' + proxy.host;
            if (workProxies.length !== i + 1) {
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

        setInterval(async () => {
            const work = [];
            for (let proxy of allProxies) {
                if (proxy.dontCheck ?? await ProxyCheck(proxy.source)) {
                    work.push(proxy);
                }
            }

            const oldRules = proxyCfg.proxyRules;
            proxyCfg.proxyRules = '';

            for (let i = 0; i < work.length; i++) {
                const proxy = work[i];
                proxyCfg.proxyRules += proxy.scheme + '://' + proxy.host;
                if (work.length !== i + 1) {
                    proxyCfg.proxyRules += ',';
                }
            }

            if (proxyCfg.proxyRules === oldRules)
                return;

            if (work.length === 0 && this.failedChecks < 5) {
                this.failedChecks++;
            } else if (work.length !== 0) {
                this.failedChecks = 0;
            }

            this.proxies = work;

            await electron.session.defaultSession.setProxy(proxyCfg);
            await electron.session.defaultSession.closeAllConnections();

            for (const win of electron.BrowserWindow.getAllWindows()) {
                await win.webContents.session.setProxy(proxyCfg);
                await win.webContents.session.closeAllConnections();
            }

            if (this.previosCount !== work.length && (work.length === 0 || this.previosCount === 0)) {
                if (work.length === 0) {
                    const notify = new Notify('SoundCloud', translations.proxy_work_not_found, 10);
                    nmanager.show(notify);
                } else {
                    const notify = new Notify('SoundCloud', '', 10, __dirname + '/../icons/data-server.png');
                    notify.body = translations.proxy_connected.replaceAll('{name}', '<br>' + work.map(x => x.name).join(';<br>') + ';');
                    nmanager.show(notify);
                }

                // for (const content of webContents.getAllWebContents()) {
                //     if (content.isDestroyed()) {
                //         continue;
                //     }
                //     content.send('reload');
                // }
            }

            this.previosCount = work.length;
        }, 60000);


        this.previosCount = workProxies.length;

        if (workProxies.length === 0) {
            const notify = new Notify('SoundCloud', translations.proxy_work_not_found, 10);
            nmanager.show(notify);
        } else {
            const notify = new Notify('SoundCloud', '', 10, __dirname + '/../icons/data-server.png');
            notify.body = translations.proxy_connected.replaceAll('{name}', '<br>' + workProxies.map(x => x.name).join(';<br>') + ';');
            nmanager.show(notify);
        }

        return;
    };
}

function ParseProxy(proxy, best = false, dontCheck = false) {
    let json = {
        scheme: '',
        host: '',
        auth: false,
        login: '',
        password: '',
        source: proxy,
        bestBypass: best,
        dontCheck,
        name: '',
    }

    const parse1 = proxy.split('://');
    json.scheme = parse1[0];

    if (parse1.length < 2) {
        return json;
    }

    const parse2 = parse1[1].split('@');

    if (parse2.length < 2) {
        json.host = parse2[0];
        return json;
    }

    json.host = parse2[1];
    json.auth = true;

    const parse3 = parse2[0].split(':');

    if (parse3.length < 2) {
        parse3[1] = '';
    }

    json.login = parse3[0];
    json.password = parse3[1];

    return json;
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

        let proxyJson = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
                'sec-ch-ua': 'Google Chrome";v="136", "Chromium";v="136", "Not_A Brand";v="24"'
            }
        };

        if (proxy.startsWith('http:') || proxy.startsWith('https:')) {
            proxyJson.agent = new HttpsProxyAgent(proxy);
        } else if (proxy.startsWith('socks')) {
            proxyJson.agent = new SocksProxyAgent(proxy);
        }

        nfetch('https://soundcloud.com', proxyJson)
            .then(async (res) => {
                const content = await res.text();
                if (content.includes('The Squid Software') || !content.includes('meta content="SoundCloud"')) {
                    resolve(false);
                    _sended = true;
                    return;
                }
                resolve(res.ok);
                _sended = true;
            }).catch(() => {
            resolve(false);
            _sended = true;
        });
    });
}

function CheckAndUpdateProxy() {

}

// function CheckWorkDomain(url) {
//     return new Promise(async resolve => {
//         let _sended = false;
//
//         setTimeout(() => {
//             if (_sended) {
//                 return;
//             }
//
//             resolve(false);
//             _sended = true;
//         }, 5000);
//
//         fetch(url)
//             .then(() => {
//                 resolve(true);
//                 _sended = true;
//             }).catch(() => {
//             resolve(false);
//             _sended = true;
//         });
//     });
// }