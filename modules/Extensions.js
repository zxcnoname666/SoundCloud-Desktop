const config = require('../config');
const {app} = require('electron');

const nativeUtils = (() => {
    try {
        return require('../bins/native_utils.node');
    } catch {
        return () => {
            console.log('nativeUtils module not found');
        }
    }
})();

const _localize = Intl.DateTimeFormat().resolvedOptions().locale;
const rulang = _localize.includes('ru') || _localize.includes('kk') || _localize.includes('ky') || _localize.includes('be');

module.exports = class Extensions {
    static sleeper = {
        _timerId: 0,
        _intervalTime: 5000,

        enable() {
            this._timerId = setInterval(() => nativeUtils.sleeper(true), this._intervalTime);
        },

        disable() {
            clearInterval(this._timerId);
            nativeUtils.sleeper(false);
        }
    }

    static checkConstruction(object, construction) {
        return typeof (object) != 'undefined' && object.constructor === construction;
    }

    static isArray(object) {
        return this.checkConstruction(object, ([]).constructor);
    }

    static translationsProxy() {
        const translated = (rulang ? config.translations.ru : (config.translations[_localize] ?? config.translations.en));
        const _default = {
            proxy_available_not_found: 'Available proxy servers not found',
            proxy_work_not_found: 'Working proxy servers not found',
            proxy_connected: 'Connected to proxy servers: [HIDDEN]',
        }

        if (translated) {
            if (typeof (translated.proxy_available_not_found) == 'string') {
                _default.proxy_available_not_found = translated.proxy_available_not_found;
            }
            if (typeof (translated.proxy_work_not_found) == 'string') {
                _default.proxy_work_not_found = translated.proxy_work_not_found;
            }
            if (typeof (translated.proxy_connected) == 'string') {
                _default.proxy_connected = translated.proxy_connected;
            }
        }

        return _default;
    }

    static translationsUpdater() {
        const translated = (rulang ? config.translations.ru : (config.translations[_localize] ?? config.translations.en));
        const _default = {
            title: 'Application Update',
            details: 'A new version of the app is available. Click on the button below to select your choice.',
            notes: 'Update Notes:',
            install: 'Install',
            later: 'Later',

            installation_error: 'Installation error',
            missing_hash: 'Missing hash',
            missing_hash_message: 'The hash of the downloaded update differs from the hash specified in the config. Most likely, the traffic was intercepted (or someone forgot to update the hash)',
        }

        if (translated) {
            if (typeof (translated.updater_title) == 'string') {
                _default.title = translated.updater_title;
            }
            if (typeof (translated.updater_details) == 'string') {
                _default.details = translated.updater_details;
            }
            if (typeof (translated.updater_notes) == 'string') {
                _default.notes = translated.updater_notes;
            }
            if (typeof (translated.updater_install) == 'string') {
                _default.install = translated.updater_install;
            }
            if (typeof (translated.updater_later) == 'string') {
                _default.later = translated.updater_later;
            }

            if (typeof (translated.updater_installation_error) == 'string') {
                _default.installation_error = translated.updater_installation_error;
            }
            if (typeof (translated.updater_missing_hash) == 'string') {
                _default.missing_hash = translated.updater_missing_hash;
            }
            if (typeof (translated.updater_missing_hash_message) == 'string') {
                _default.missing_hash_message = translated.updater_missing_hash_message;
            }
        }

        return _default;
    }

    static translationsTasks() {
        const translated = (rulang ? config.translations.ru : (config.translations[_localize] ?? config.translations.en));
        const _default = {
            quit: 'Quit',
            quit_desc: 'Close the app',
        }

        if (translated) {
            if (typeof (translated.tasks_quit) == 'string') {
                _default.quit = translated.tasks_quit;
            }
            if (typeof (translated.tasks_quit_desc) == 'string') {
                _default.quit_desc = translated.tasks_quit_desc;
            }
        }

        return _default;
    }

    static setEfficiency(pid, value = true) {
        try {
            if (this.getEfficiency(pid) === value) {
                return;
            }

            nativeUtils.setEfficiency(pid, value);
        } catch (err) {
            console.log(err);
        }
    }

    static getEfficiency(pid) {
        try {
            return nativeUtils.getEfficiency(pid);
        } catch {
            return false;
        }
    }

    static protocolInject() {
        nativeUtils.protocolInject(app.getPath('exe'));
    }

}