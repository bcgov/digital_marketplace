import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import Knex from 'knex';

const logger = makeDomainLogger(consoleAdapter, 'migrations');

const SKILLS = [
  'Delivery Management',
  'Front-End Development',
  'Back-End Development',
  'DevOps',
  'User Experience Design',
  'User Interface Design',
  'User Research'
];

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable('users', table => {
    table.specificType('capabilities', 'TEXT[]').defaultTo('{}').notNullable();
  });

  await connection.schema.raw(`
  ALTER TABLE "users" \
  ADD CONSTRAINT "users_capabilities_check" \
  CHECK (capabilities <@ ARRAY['${Object.values(SKILLS).join('\',\'')}']) \
  `);

  logger.info('Modified users table.');
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.raw(' \
    ALTER TABLE "users" \
    DROP CONSTRAINT "users_capabilities_check" \
  ');

  await connection.schema.alterTable('users', table => {
    table.dropColumn('capabilities');
  });
  logger.info('Reverted users table.');
}
