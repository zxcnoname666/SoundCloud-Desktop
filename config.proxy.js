module.exports = [
    {
        url: 'http://soundcloud-proxy-root.loli-xxx.baby:3128',
        name: 'Main Proxy',
    },
    {
        url: 'socks://soundcloud-proxy-root.loli-xxx.baby:9999',
        name: 'Tor Proxy via socks',
    },
    {
        url: 'http://soundcloud-proxy-root.loli-xxx.baby:9998',
        name: 'Bypass Proxy',
        bestBypass: true,
    },
    {
        url: 'http://soundcloud-proxy-bypass.loli-xxx.baby:3128',
        name: 'Bypass Proxy [Reserve]',
        bestBypass: true,
    },
    {
        url: 'socks://soundcloud-proxy-bypass.loli-xxx.baby:9999',
        name: 'Tor Proxy [Reserve]',
        bestBypass: true,
    },
]