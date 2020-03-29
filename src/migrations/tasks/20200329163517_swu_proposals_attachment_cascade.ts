import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import Knex from 'knex';

const logger = makeDomainLogger(consoleAdapter, 'migrations');

export async function up(connection: Knex): Promise<void> {
  await connection.schema.raw(`
    ALTER TABLE "swuProposalAttachments" DROP CONSTRAINT swuproposalattachments_proposal_foreign;
    ALTER TABLE "swuProposalAttachments" ADD CONSTRAINT swuproposalattachments_proposal_foreign FOREIGN KEY (proposal) REFERENCES "swuProposals" (id) ON DELETE CASCADE;
  `);
  logger.info('Completed modifying swuProposalAttachments table.');
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.raw(`
    ALTER TABLE "swuProposalAttachments" DROP CONSTRAINT swuproposalattachments_proposal_foreign;
    ALTER TABLE "swuProposalAttachments" ADD CONSTRAINT swuproposalattachments_proposal_foreign FOREIGN KEY (proposal) REFERENCES "swuProposals" (id);
  `);
  logger.info('Completed reverting swuProposalAttachments table.');
}
