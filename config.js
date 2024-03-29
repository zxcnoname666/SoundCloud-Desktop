module.exports = {
    proxy: [
        //'http://1.1.1.1:80',
        //'socks://1.1.1.1:1000',
    ],
    translations: {
        ru: { // ru, kk, ky, be
            proxy_available_not_found: 'Доступные прокси-серверы не найдены',
            proxy_work_not_found: 'Работающие прокси-серверы не найдены',
            proxy_connected: 'Подключен к прокси-серверу: {ip}',
        },
        en: {
            proxy_available_not_found: 'Available proxy servers not found',
            proxy_work_not_found: 'Working proxy servers not found',
            proxy_connected: 'Connected to proxy servers: {ip}',
        },
        /*
        'iso code': {...},
        */
    }
};