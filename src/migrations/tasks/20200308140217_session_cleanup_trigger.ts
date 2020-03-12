import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import Knex from 'knex';

const logger = makeDomainLogger(consoleAdapter, 'migrations');

export async function up(connection: Knex): Promise<void> {
  await connection.schema.raw(`
    CREATE FUNCTION delete_old_sessions() RETURNS trigger
      LANGUAGE plpgsql
      AS $$
    BEGIN
      DELETE FROM sessions WHERE "createdAt" < NOW() - INTERVAL '7 days';
      RETURN NULL;
    END;
    $$;
  `);

  logger.info('Created delete_old_sessions function.');

  await connection.schema.raw(`
    CREATE TRIGGER trigger_delete_old_rows
      AFTER INSERT ON sessions
      EXECUTE PROCEDURE delete_old_sessions();
  `);

  logger.info('Created trigger_delete_old_rows trigger on sessions table.');
}

export async function down(connection: Knex): Promise<void> {

  await connection.schema.raw(`
    DROP TRIGGER trigger_delete_old_rows ON sessions;
  `);

  logger.info('Dropped trigger trigger_delete_old_rows on sessions table.');

  await connection.schema.raw(`
    DROP FUNCTION delete_old_sessions;
  `);

  logger.info('Dropped function delete_old_sessions');
}
