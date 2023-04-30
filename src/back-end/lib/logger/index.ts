import { LOG_LEVEL } from "back-end/config";
import { Adapter, AdapterFunction } from "back-end/lib/logger/adapters";
import { reduce } from "lodash";

const LogLevelValues = {
  debug: 4,
  info: 3,
  warn: 2,
  error: 1,
  none: 0
};

export type LogLevel = keyof typeof LogLevelValues;

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

export function parseLogLevel(input: string): LogLevel | null {
  const level = input.toLowerCase() as LogLevel;
  return LogLevelValues[level] ? level : null;
}

export function logLevelEnabled(level: LogLevel): boolean {
  return LogLevelValues[level] <= LogLevelValues[LOG_LEVEL as LogLevel];
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
    debug: logLevelEnabled("debug") ? logWith(adapter.debug) : noOpLog,
    info: logLevelEnabled("info") ? logWith(adapter.info) : noOpLog,
    warn: logLevelEnabled("warn") ? logWith(adapter.warn) : noOpLog,
    error: logLevelEnabled("error") ? logWith(adapter.error) : noOpLog
  };
}

const noOpLog: LogFunction = logWith((_domain, _msg) => {
  return;
});

export function makeDomainLogger(
  adapter: Adapter,
  domain: string
): DomainLogger {
  const { info, warn, error, debug } = makeLogger(adapter);
  return {
    info: info.bind(null, domain),
    warn: warn.bind(null, domain),
    error: error.bind(null, domain),
    debug: debug.bind(null, domain)
  };
}
