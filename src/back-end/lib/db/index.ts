import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";
import { invalid, Validation } from "shared/lib/validation";

const logger = makeDomainLogger(consoleAdapter, "back-end");

/**
 * A Connection type that wraps a Knex connection.
 */
export type Connection = Knex;

export type Transaction = Knex.Transaction;

export const ERROR_MESSAGE = "Database error.";

export type DatabaseValidation<Valid> = Validation<Valid, null>;

type DbFn<Args extends unknown[], Valid> = (
  connection: Connection,
  ...args: Args
) => Promise<DatabaseValidation<Valid>>;

export function tryDb<Args extends unknown[], Valid>(
  fn: DbFn<Args, Valid>
): DbFn<Args, Valid> {
  return async (connection, ...args) => {
    try {
      return await fn(connection, ...args);
    } catch (e) {
      const error = e as Error;
      logger.error("database operation failed", {
        message: error.message,
        stack: error.stack
      });
      return invalid(null);
    }
  };
}

export * from "back-end/lib/db/affiliation";
export * from "back-end/lib/db/file";
export * from "back-end/lib/db/content";
export * from "back-end/lib/db/counter";
export * from "back-end/lib/db/metrics";
export * from "back-end/lib/db/opportunity/code-with-us";
export * from "back-end/lib/db/opportunity/sprint-with-us";
export * from "back-end/lib/db/opportunity/team-with-us";
export * from "back-end/lib/db/organization";
export * from "back-end/lib/db/proposal/code-with-us";
export * from "back-end/lib/db/proposal/sprint-with-us";
export * from "back-end/lib/db/session";
export * from "back-end/lib/db/subscribers/code-with-us";
export * from "back-end/lib/db/subscribers/sprint-with-us";
export * from "back-end/lib/db/subscribers/team-with-us";
export * from "back-end/lib/db/user";
export * from "back-end/lib/db/serviceArea";
