import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import Knex from 'knex';

const logger = makeDomainLogger(consoleAdapter, 'migrations', 'development');

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable('cwuProposalStatuses', table => {
    table.dropForeign(['proposal']);
    table.foreign('proposal').references('id').inTable('cwuProposals').onDelete('CASCADE');
  });

  await connection.schema.alterTable('cwuProposalAttachments', table => {
    table.dropForeign(['proposal']);
    table.foreign('proposal').references('id').inTable('cwuProposals').onDelete('CASCADE');
  });

  logger.info('Completed altering CWU proposals table.');
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable('cwuProposalStatuses', table => {
    table.dropForeign(['proposal']);
    table.foreign('proposal').references('id').inTable('cwuProposals');
  });

  await connection.schema.alterTable('cwuProposalAttachments', table => {
    table.dropForeign(['proposal']);
    table.foreign('proposal').references('id').inTable('cwuProposals');
  });

  logger.info('Completed reverting CWU proposals table.');
}
