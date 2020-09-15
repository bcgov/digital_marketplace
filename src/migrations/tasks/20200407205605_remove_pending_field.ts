import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import Knex from 'knex';

const logger = makeDomainLogger(consoleAdapter, 'migrations', 'development');

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable('swuProposalTeamMembers', table => {
    table.dropColumn('pending');
  });
  logger.info('Completed modifying swuProposalTeamMembers table.');
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable('swuProposalTeamMembers', table => {
    table.boolean('pending').defaultTo(false).notNullable();
  });
  logger.info('Completed reverting swuProposalTeamMembers table.');
}
