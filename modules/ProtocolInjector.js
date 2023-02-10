const { app } = require('electron');
const Registry = require('winreg');

module.exports = async () => {
    try {
        const main = '\\Software\\Classes\\sc';

        const registry = new Registry({
            hive: Registry.HKCU,
            key: main
        });

        const exist = await new Promise((resolve, reject) => {
            registry.keyExists((err, exist) => {
                if (err) return reject(err);
                resolve(exist);
            });
        });

        if (exist) {
            await new Promise((resolve, reject) =>
                registry.destroy((err) => {
                    if (err) return reject(err);
                    return resolve(true);
                })
            );
        }

        await new Promise((resolve, reject) =>
            registry.create((err) => {
                if (err) return reject(err);
                return resolve(true);
            })
        );


        await new Promise((resolve, reject) =>
            registry.set(
                'URL Protocol',
                Registry.REG_SZ,
                Registry.DEFAULT_VALUE,
                (err) => {
                    if (err) return reject(err);
                    return resolve(true);
                }
            )
        );

        await new Promise((resolve, reject) =>
            registry.set(
                Registry.DEFAULT_VALUE,
                Registry.REG_SZ,
                'URL:sc',
                (err) => {
                    if (err) return reject(err);
                    return resolve(true);
                }
            )
        );

        const commandRegistry = new Registry({
            hive: Registry.HKCU,
            key: main + '\\shell\\open\\command'
        });

        await new Promise((resolve, reject) =>
            commandRegistry.set(
                Registry.DEFAULT_VALUE,
                Registry.REG_SZ,
                app.getPath('exe') + ' %1',
                (err) => {
                    if (err) return reject(err);
                    return resolve(true);
                }
            )
        );

        console.log('\x1b[32m%s\x1b[0m', 'Protocol injected');
    } catch (e) {
        console.log('Protocol errored:\n' + e);
    }
};