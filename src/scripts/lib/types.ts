import { DomainLogger } from "back-end/lib/logger";
import { Argv } from "yargs";

export interface ScriptParams {
  logger: DomainLogger;
  argv: Argv["argv"];
}

export type Script = (params: ScriptParams) => Promise<boolean>;
