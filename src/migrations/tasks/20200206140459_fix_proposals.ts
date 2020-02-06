import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import Knex from 'knex';

const logger = makeDomainLogger(consoleAdapter, 'migrations');

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable('cwuProposals', table => {
    table.uuid('opportunity').references('id').inTable('cwuOpportunities').notNullable();
    table.renameColumn('proponentOrg', 'proponentOrganization');
    table.dropForeign(['proponentIndividual']);
    table.foreign('proponentIndividual').references('id').inTable('cwuProponents').onDelete('CASCADE');
  });

  await connection.schema.alterTable('cwuProponents', table => {
    table.renameColumn('streetAddress1', 'street1');
    table.renameColumn('streetAddress2', 'street2');
  });

  await connection.schema.alterTable('cwuProposalStatuses', table => {
    table.string('note');
  });
  logger.info('Completed altering cwuProposal tables.');
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable('cwuProposals', table => {
    table.dropColumn('opportunity');
    table.renameColumn('proponentOrganization', 'proponentOrg');
    table.dropForeign(['proponentIndividual']);
    table.foreign('proponentIndividual').references('id').inTable('cwuProponents');
  });

  await connection.schema.alterTable('cwuProponents', table => {
    table.renameColumn('street1', 'streetAddress1');
    table.renameColumn('street2', 'streetAddress2');
  });

  await connection.schema.alterTable('cwuProposalStatuses', table => {
    table.dropColumn('note');
  });
  logger.info('Completed reverting cwuProposals/cwuProponents tables.');
}
