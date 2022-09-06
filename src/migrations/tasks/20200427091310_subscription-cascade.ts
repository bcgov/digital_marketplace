import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations", "development");

export async function up(connection: Knex): Promise<void> {
  await connection.schema.raw(`
    ALTER TABLE "cwuOpportunitySubscribers" DROP CONSTRAINT cwuopportunitysubscribers_opportunity_foreign;
    ALTER TABLE "cwuOpportunitySubscribers" ADD CONSTRAINT cwuopportunitysubscribers_opportunity_foreign FOREIGN KEY (opportunity) \
      REFERENCES "cwuOpportunities"(id) ON DELETE CASCADE;
  `);
  logger.info("Completed modifying cwuOpportunitySubscribers");

  await connection.schema.raw(`
    ALTER TABLE "swuOpportunitySubscribers" DROP CONSTRAINT swuopportunitysubscribers_opportunity_foreign;
    ALTER TABLE "swuOpportunitySubscribers" ADD CONSTRAINT swuopportunitysubscribers_opportunity_foreign FOREIGN KEY (opportunity) \
      REFERENCES "swuOpportunities"(id) ON DELETE CASCADE;
  `);
  logger.info("Completed modifying swuOpportunitySubscribers");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.raw(`
    ALTER TABLE "swuOpportunitySubscribers" DROP CONSTRAINT swuopportunitysubscribers_opportunity_foreign;
    ALTER TABLE "swuOpportunitySubscribers" ADD CONSTRAINT swuopportunitysubscribers_opportunity_foreign FOREIGN KEY (opportunity) \
      REFERENCES "swuOpportunities"(id);
  `);
  logger.info("Completed reverting swuOpportunitySubscribers");

  await connection.schema.raw(`
    ALTER TABLE "cwuOpportunitySubscribers" DROP CONSTRAINT cwuopportunitysubscribers_opportunity_foreign;
    ALTER TABLE "cwuOpportunitySubscribers" ADD CONSTRAINT cwuopportunitysubscribers_opportunity_foreign FOREIGN KEY (opportunity) \
      REFERENCES "cwuOpportunities"(id);
  `);
  logger.info("Completed reverting cwuOpportunitySubscribers");
}
