const {app} = require('electron');
const {join} = require("node:path");
const {existsSync} = require("node:fs");

let proxyFile = join(app.getPath("appData"), "soundcloud", "config.proxy.js");
if (!existsSync(proxyFile)) {
    proxyFile = join(__dirname, "config.proxy.js");
}

module.exports = {
    proxy: require(proxyFile),
    autoUpdate: true,
    translations: {
        ru: { // ru, kk, ky, be
            proxy_available_not_found: 'Доступные прокси-серверы не найдены',
            proxy_work_not_found: 'Работающие прокси-серверы не найдены',
            proxy_connected: 'Подключен к прокси-серверу: {name}',

            updater_title: 'Обновление приложения',
            updater_details: 'Доступна новая версия приложения. Нажмите на кнопку ниже для выбора.',
            updater_notes: 'Заметки обновления:',
            updater_install: 'Установить',
            updater_later: 'Позже',

            updater_installation_error: 'Ошибка установки',
            updater_missing_hash: 'Несовпадение хэша',
            updater_missing_hash_message: 'Хэш загруженного обновления отличается от указанного в конфиге. Вероятнее всего, трафик был перехвачен (или кто-то забыл обновить хэш)',

            tasks_quit: 'Закрыть',
            tasks_quit_desc: 'Закрыть приложение',
        },
        en: {
            proxy_available_not_found: 'Available proxy servers not found',
            proxy_work_not_found: 'Working proxy servers not found',
            proxy_connected: 'Connected to proxy servers: {name}',

            updater_title: 'Application Update',
            updater_details: 'A new version of the app is available. Click on the button below to select your choice.',
            updater_notes: 'Update Notes:',
            updater_install: 'Install',
            updater_later: 'Later',

            updater_installation_error: 'Installation error',
            updater_missing_hash: 'Missing hash',
            updater_missing_hash_message: 'The hash of the downloaded update differs from the hash specified in the config. Most likely, the traffic was intercepted (or someone forgot to update the hash)',

            tasks_quit: 'Quit',
            tasks_quit_desc: 'Close the app',
        },
        /*
        'iso code': {...},
        */
    }
}