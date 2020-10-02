import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import Knex from 'knex';

makeDomainLogger(consoleAdapter, 'migrations', 'development');

export async function up(connection: Knex): Promise<void> {
  // Drop previous trigger
  await connection.schema.raw(`
    DROP TRIGGER trigger_delete_old_rows ON sessions;
  `);

  // Drop previous trigger function
  await connection.schema.raw(`
  DROP FUNCTION delete_old_sessions;
`);

  // Recreate trigger function with update lock
  // The update lock will prevent updates to any of the affected rows during execution of this function.
  await connection.schema.raw(`
    CREATE FUNCTION delete_old_sessions() RETURNS trigger
      LANGUAGE plpgsql
      AS $$
    DECLARE
      rows TEXT;
    BEGIN
      SELECT id FROM sessions WHERE "createdAt" < NOW() - INTERVAL '7 days' FOR UPDATE INTO rows;
      DELETE FROM sessions WHERE "createdAt" < NOW() - INTERVAL '7 days';
      RETURN null;
    END;
    $$;
  `);

  // Recreate trigger
  await connection.schema.raw(`
  CREATE TRIGGER trigger_delete_old_rows
    AFTER INSERT ON sessions
    EXECUTE PROCEDURE delete_old_sessions();
  `);
}

export async function down(connection: Knex): Promise<void> {
  // Drop previous trigger
  await connection.schema.raw(`
    DROP TRIGGER trigger_delete_old_rows ON sessions;
  `);

  // Drop previous trigger function
  await connection.schema.raw(`
    DROP FUNCTION delete_old_sessions;
  `);

  // Recreate trigger function with update lock
  // The update lock will prevent updates to any of the affected rows during execution of this function.
  await connection.schema.raw(`
    CREATE FUNCTION delete_old_sessions() RETURNS trigger
      LANGUAGE plpgsql
      AS $$
    DECLARE
      rows TEXT;
    BEGIN
      SELECT id FROM sessions WHERE "createdAt" < NOW() - INTERVAL '7 days' FOR UPDATE INTO rows;
      DELETE FROM sessions WHERE "createdAt" < NOW() - INTERVAL '7 days';
      RETURN rows;
    END;
    $$;
  `);

  // Recreate trigger
  await connection.schema.raw(`
  CREATE TRIGGER trigger_delete_old_rows
    AFTER INSERT ON sessions
    EXECUTE PROCEDURE delete_old_sessions();
  `);
}
