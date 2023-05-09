// from: https://github.com/perf2711/node-prevent-sleep
const _internal = require('./module.node');

const preventSleep = {
    _timerId: 0,
    _intervalTime: 5000,
    enable: () => {
        preventSleep._timerId = setInterval(_internal.enable, preventSleep._intervalTime);
    },
    disable: () => {
        clearInterval(preventSleep._timerId);
        _internal.disable();
    }
};

module.exports = preventSleep;