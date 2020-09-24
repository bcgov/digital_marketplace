"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
function oneLine(prefix, msg, prefixColor) {
    return `${chalk_1.default.gray('[')}${prefixColor(prefix)}${chalk_1.default.gray(']')} ${msg}\n`;
}
exports.console = {
    info(prefix, msg) {
        process.stdout.write(oneLine(prefix, msg, chalk_1.default.green));
    },
    warn(prefix, msg) {
        process.stdout.write(oneLine(prefix, msg, chalk_1.default.yellow));
    },
    error(prefix, msg) {
        process.stderr.write(oneLine(prefix, msg, chalk_1.default.red));
    },
    debug(prefix, msg) {
        process.stdout.write(oneLine(prefix, msg, chalk_1.default.blue));
    }
};
