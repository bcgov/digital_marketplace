import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import Knex from 'knex';

const logger = makeDomainLogger(consoleAdapter, 'migrations', 'development');

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable('cwuOpportunityVersions', table => {
    table.dropForeign(['opportunity']);
    table.foreign('opportunity').references('id').inTable('cwuOpportunities').onDelete('CASCADE');
  });

  await connection.schema.alterTable('cwuOpportunityStatuses', table => {
    table.dropForeign(['opportunity']);
    table.foreign('opportunity').references('id').inTable('cwuOpportunities').onDelete('CASCADE');
  });

  await connection.schema.alterTable('cwuOpportunityAddenda', table => {
    table.dropForeign(['opportunity']);
    table.foreign('opportunity').references('id').inTable('cwuOpportunities').onDelete('CASCADE');
  });

  await connection.schema.alterTable('cwuOpportunityAttachments', table => {
    table.dropForeign(['opportunityVersion']);
    table.foreign('opportunityVersion').references('id').inTable('cwuOpportunityVersions').onDelete('CASCADE');
  });

  logger.info('Completed altering CWU opportunity tables.');
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable('cwuOpportunityVersions', table => {
    table.dropForeign(['opportunity']);
    table.foreign('opportunity').references('id').inTable('cwuOpportunities');
  });

  await connection.schema.alterTable('cwuOpportunityStatuses', table => {
    table.dropForeign(['opportunity']);
    table.foreign('opportunity').references('id').inTable('cwuOpportunities');
  });

  await connection.schema.alterTable('cwuOpportunityAddenda', table => {
    table.dropForeign(['opportunity']);
    table.foreign('opportunity').references('id').inTable('cwuOpportunities');
  });

  await connection.schema.alterTable('cwuOpportunityAttachments', table => {
    table.dropForeign(['opportunityVersion']);
    table.foreign('opportunityVersion').references('id').inTable('cwuOpportunityVersions');
  });

  logger.info('Completed reverting cascades on CWU opportunity tables.');
}
