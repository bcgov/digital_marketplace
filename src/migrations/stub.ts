import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";

makeDomainLogger(consoleAdapter, "migrations");

export async function up(connection: Knex): Promise<void> {} // eslint-disable-line

export async function down(connection: Knex): Promise<void> {} // eslint-disable-line
