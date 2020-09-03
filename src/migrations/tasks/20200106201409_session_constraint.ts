import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import Knex from 'knex';

const logger = makeDomainLogger(consoleAdapter, 'migrations', 'development');

export async function up(connection: Knex): Promise<void> {
  await connection.schema.raw(`
    ALTER TABLE sessions
    ADD CONSTRAINT "noAccessTokenWithoutUser" check(
      ("user" IS NOT NULL AND "accessToken" IS NOT NULL)
      OR
      ("user" IS NULL AND "accessToken" IS NULL)
    )
  `);
  logger.info('Added noAccessTokenWithoutUser constraint to sessions table.');
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.raw(`
    ALTER TABLE sessions
    DROP CONSTRAINT "noAccessTokenWithoutUser"
  `);
  logger.info('Removed noAccessTokenWithoutUser constraint from sessions table.');
}
