module.exports = {
    proxy: {
        default: [],
        // use public proxies? This is not recommended for security reasons.
        usePublic: false
    },
    translations: {
        ru: { // ru, kk, ky, be
            proxy_available_not_found: 'Доступные прокси-сервера не найдены',
            proxy_work_not_found: 'Работающие прокси-сервера не найдены',
            proxy_connected: 'Подключен к прокси-серверу - ',
        },
        en: {
            proxy_available_not_found: 'Available proxy servers not found',
            proxy_work_not_found: 'No working proxy servers found',
            proxy_connected: 'Connected to proxy server - ',
        },
        /*
        'iso code': {...},
        */
    }
};