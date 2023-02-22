import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";

enum CWUOpportunityEvent {
  Edited = "EDITED",
  AddendumAdded = "ADDENDUM_ADDED"
}

enum CWUProposalEvent {
  ScoreEntered = "SCORE_ENTERED"
}

const logger = makeDomainLogger(consoleAdapter, "migrations");

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable("cwuOpportunityStatuses", (table) => {
    table.enu("event", Object.values(CWUOpportunityEvent)).nullable();
    table.string("status").nullable().alter();
  });

  await connection.schema.raw(`
    ALTER TABLE "cwuOpportunityStatuses"
    ADD CONSTRAINT "eitherEventOrStatus" check(
      ("event" IS NOT NULL AND "status" IS NULL)
      OR
      ("event" IS NULL AND "status" IS NOT NULL)
    )
  `);

  logger.info("Completed modifying cwuOpportunityStatus table.");

  await connection.schema.alterTable("cwuProposalStatuses", (table) => {
    table.enu("event", Object.values(CWUProposalEvent)).nullable();
    table.string("status").nullable().alter();
  });

  await connection.schema.raw(`
    ALTER TABLE "cwuProposalStatuses"
    ADD CONSTRAINT "eitherEventOrStatus" check(
      ("event" IS NOT NULL AND "status" IS NULL)
      OR
      ("event" IS NULL AND "status" IS NOT NULL)
    )
  `);

  logger.info("Completed modifying cwuProposalStatuses table.");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.raw(`
    ALTER TABLE "cwuOpportunityStatuses"
    DROP CONSTRAINT "eitherEventOrStatus"
  `);

  await connection.schema.alterTable("cwuOpportunityStatuses", (table) => {
    table.dropColumn("event");
    table.string("status").notNullable().alter();
  });

  logger.info("Completed reverting cwuOpportunityStatuses table.");

  await connection.schema.raw(`
    ALTER TABLE "cwuProposalStatuses"
    DROP CONSTRAINT "eitherEventOrStatus"
  `);

  await connection.schema.alterTable("cwuProposalStatuses", (table) => {
    table.dropColumn("event");
    table.string("status").notNullable().alter();
  });

  logger.info("Completed reverting cwuProposals table.");
}
