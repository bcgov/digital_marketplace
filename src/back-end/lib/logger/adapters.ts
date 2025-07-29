import chalk from "chalk";

export type AdapterFunction = (prefix: string, msg: string) => void;

export interface Adapter {
  info: AdapterFunction;
  warn: AdapterFunction;
  error: AdapterFunction;
  debug: AdapterFunction;
}

function oneLine(
  prefix: string,
  msg: string,
  prefixColor: typeof chalk
): string {
  return `${chalk.gray("[")}${prefixColor(prefix)}${chalk.gray("]")} ${msg}\n`;
}

export const console: Adapter = {
  info(prefix, msg) {
    process.stdout.write(oneLine(prefix, msg, chalk.green));
  },

  warn(prefix, msg) {
    process.stdout.write(oneLine(prefix, msg, chalk.yellow));
  },

  error(prefix, msg) {
    process.stderr.write(oneLine(prefix, msg, chalk.red));
  },

  debug(prefix, msg) {
    process.stdout.write(oneLine(prefix, msg, chalk.blue));
  }
};
