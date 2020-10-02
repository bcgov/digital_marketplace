import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import Knex from 'knex';

const logger = makeDomainLogger(consoleAdapter, 'migrations', 'development');

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable('cwuProponents', table => {
    table.text('street2').nullable().alter();
    table.text('phone').nullable().alter();
  });
  logger.info('Completed modifying cwuProponents table.');
}

export async function down(connection: Knex): Promise<void> {
  await connection('cwuProponents')
    .whereNull('street2')
    .update({ street2: '' });
  await connection('cwuProponents')
    .whereNull('phone')
    .update({ phone: '' });
  await connection.schema.alterTable('cwuProponents', table => {
    table.text('street2').notNullable().alter();
    table.text('phone').notNullable().alter();
  });
  logger.info('Completed reverting cwuProponents table.');
}
