import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable("swuProposals", (table) => {
    table.uuid("opportunity").references("id").inTable("swuOpportunities");
    table.uuid("organization").references("id").inTable("organizations");
  });
  logger.info("Modified table swuProposals");

  // Correct wrong reference for proposals <-> attachments
  await connection.schema.raw(`
    ALTER TABLE "swuProposalAttachments" DROP CONSTRAINT swuproposalattachments_proposal_foreign;
    ALTER TABLE "swuProposalAttachments" ADD CONSTRAINT swuproposalattachments_proposal_foreign FOREIGN KEY (proposal) REFERENCES "swuProposals" (id);
  `);
  logger.info("Modified table swuProposalAttachments");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable("swuProposals", (table) => {
    table.dropColumn("opportunity");
    table.dropColumn("organization");
  });
  logger.info("Reverted table swuProposals");

  await connection.schema.raw(`
    ALTER TABLE "swuProposalAttachments" DROP CONSTRAINT swuproposalattachments_proposal_foreign;
    ALTER TABLE "swuProposalAttachments" ADD CONSTRAINT swuproposalattachments_proposal_foreign FOREIGN KEY (proposal) REFERENCES "cwuProposals" (id);
  `);
  logger.info("Modified table swuProposalAttachments");
}
