"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
function logWith(adapter) {
    return (domain, msg, data = {}) => {
        const dataMsg = lodash_1.reduce(data, (acc, v, k) => {
            return `${k}=${JSON.stringify(v)} ${acc}`;
        }, '');
        adapter(domain, `${msg} ${dataMsg}`);
    };
}
exports.logWith = logWith;
function makeLogger(adapter) {
    return {
        info: logWith(adapter.info),
        warn: logWith(adapter.warn),
        error: logWith(adapter.error),
        debug: logWith(adapter.debug)
    };
}
exports.makeLogger = makeLogger;
const noOpLog = logWith((domain, msg) => { return; });
function makeDomainLogger(adapter, domain, env) {
    const { info, warn, error, debug } = makeLogger(adapter);
    const isDev = env === 'development';
    return {
        info: info.bind(null, domain),
        warn: warn.bind(null, domain),
        error: error.bind(null, domain),
        debug: isDev ? debug.bind(null, domain) : noOpLog.bind(null, domain)
    };
}
exports.makeDomainLogger = makeDomainLogger;
