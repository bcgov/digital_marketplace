import { Adapter, AdapterFunction } from "back-end/lib/logger/adapters";
import { reduce } from "lodash";

export type LogFunction = (domain: string, msg: string, data?: object) => void;

export type DomainLogFunction = (msg: string, data?: object) => void;

export interface Logger {
  info: LogFunction;
  warn: LogFunction;
  error: LogFunction;
  debug: LogFunction;
}

export interface DomainLogger {
  info: DomainLogFunction;
  warn: DomainLogFunction;
  error: DomainLogFunction;
  debug: DomainLogFunction;
}

export function logWith(adapter: AdapterFunction): LogFunction {
  return (domain, msg, data = {}) => {
    const dataMsg = reduce<object, string>(
      data,
      (acc, v, k) => {
        return `${k}=${JSON.stringify(v)} ${acc}`;
      },
      ""
    );
    adapter(domain, `${msg} ${dataMsg}`);
  };
}

export function makeLogger(adapter: Adapter): Logger {
  return {
    info: logWith(adapter.info),
    warn: logWith(adapter.warn),
    error: logWith(adapter.error),
    debug: logWith(adapter.debug)
  };
}

const noOpLog: LogFunction = logWith((_domain, _msg) => {
  return;
});

export function makeDomainLogger(
  adapter: Adapter,
  domain: string,
  env: "development" | "production"
): DomainLogger {
  const { info, warn, error, debug } = makeLogger(adapter);
  const isDev = env === "development";
  return {
    info: info.bind(null, domain),
    warn: warn.bind(null, domain),
    error: error.bind(null, domain),
    debug: isDev ? debug.bind(null, domain) : noOpLog.bind(null, domain)
  };
}
