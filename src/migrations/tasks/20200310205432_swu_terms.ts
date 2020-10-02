import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import Knex from 'knex';

const logger = makeDomainLogger(consoleAdapter, 'migrations', 'development');

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable('organizations', table => {
    table.timestamp('acceptedSWUTerms').nullable();
  });
  logger.info('Modified organizations table.');
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable('organizations', table => {
    table.dropColumn('acceptedSWUTerms');
  });
  logger.info('Reverted organizations table.');
}
