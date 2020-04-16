import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import Knex from 'knex';

const logger = makeDomainLogger(consoleAdapter, 'migrations');

export async function up(connection: Knex): Promise<void> {
  await connection.schema.raw(`
    ALTER TABLE sessions
    DROP CONSTRAINT "noAccessTokenWithoutUser";
  `);
  await connection('sessions')
    .whereNull('accessToken')
    .delete();
  await connection.schema.alterTable('sessions', table => {
    table.text('accessToken').notNullable().alter();
    table.uuid('user').notNullable().alter();
  });
  logger.info('Completed modifying sessions table.');
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable('sessions', table => {
    table.text('accessToken').nullable().alter();
    table.uuid('user').nullable().alter();
  });

  await connection.schema.raw(`
    ALTER TABLE sessions
    ADD CONSTRAINT "noAccessTokenWithoutUser" check(
      ("user" IS NOT NULL AND "accessToken" IS NOT NULL)
      OR
      ("user" IS NULL AND "accessToken" IS NULL)
    )
  `);
  logger.info('Completed reverting sessions table.');
}
