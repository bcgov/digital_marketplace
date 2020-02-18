import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import Knex from 'knex';

const logger = makeDomainLogger(consoleAdapter, 'migrations');

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable('cwuOpportunityStatuses', table => {
    table.uuid('createdBy').nullable().alter();
  });
  logger.info('Completed modifying users table.');
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable('cwuOpportunityStatuses', table => {
    table.uuid('createdBy').notNullable().alter();
  });
  logger.info('Completed reverting users table.');
}
