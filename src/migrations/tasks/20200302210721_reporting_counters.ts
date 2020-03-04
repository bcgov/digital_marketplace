import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import Knex from 'knex';

const logger = makeDomainLogger(consoleAdapter, 'migrations');

export async function up(connection: Knex): Promise<void> {
  await connection.schema.createTable('viewCounters', table => {
    table.string('name').primary().notNullable();
    table.integer('count').notNullable();
  });

  await connection.schema.raw(`
    ALTER TABLE "viewCounters"
    ADD CONSTRAINT "name_alpha_numeric" check (name ~ '^[a-zA-Z0-9.-]+$');
  `);

  logger.info('Created table viewCounters.');
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.dropTable('viewCounters');
  logger.info('Dropped table viewCounters.');
}
