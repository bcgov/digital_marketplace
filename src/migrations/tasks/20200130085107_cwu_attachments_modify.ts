import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import Knex from 'knex';

const logger = makeDomainLogger(consoleAdapter, 'migrations', 'development');

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable('cwuOpportunityAttachments', table => {
    table.dropColumn('id');
    table.primary(['opportunityVersion', 'file'], 'cwuOpportunityAttachments_pkey');
  });
  logger.info('Altered table cwuOpportunityAttachments.');

  await connection.schema.alterTable('cwuProposalAttachments', table => {
    table.dropColumn('id');
    table.primary(['proposal', 'file'], 'cwuProposalAttachments_pkey');
  });
  logger.info('Altered table cwuProposalAttachments.');
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable('cwuOpportunityAttachments', table => {
    table.dropPrimary('cwuOpportunityAttachments_pkey');
    table.uuid('id').primary().unique().notNullable();
  });
  logger.info('Reverted table cwuOpportunityAttachments.');

  await connection.schema.alterTable('cwuProposalAttachments', table => {
    table.dropPrimary('cwuProposalAttachments_pkey');
    table.uuid('id').primary().unique().notNullable();
  });
  logger.info('Reverted table cwuProposalAttachments.');
}
