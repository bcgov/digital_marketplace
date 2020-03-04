import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import Knex from 'knex';

const logger = makeDomainLogger(consoleAdapter, 'migrations');

export async function up(connection: Knex): Promise<void> {
  await connection.schema.createTable('teamCapabilities', table => {
    table.uuid('id').primary().unique().notNullable();
    table.timestamp('createdAt').notNullable();
  });
  logger.info('Created teamCapabilities table.');
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.dropTable('teamCapabilities');
  logger.info('Dropped teamCapabilities table.');
}
