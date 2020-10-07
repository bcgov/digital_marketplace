import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import Knex from 'knex';

const logger = makeDomainLogger(consoleAdapter, 'migrations', 'development');

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable('swuOpportunityVersions', table => {
    table.integer('minTeamMembers').nullable().alter();
  });
  logger.info('Completed modifying swuOpportunityVersions table.');
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable('swuOpportunityVersions', table => {
    table.integer('minTeamMembers').notNullable().alter();
  });
  logger.info('Completed reverting swuOpportunityVersions table.');
}
