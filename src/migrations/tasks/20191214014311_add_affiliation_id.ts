import { generateUuid } from 'back-end/lib';
import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import Knex from 'knex';
import { MembershipStatus } from 'shared/lib/resources/affiliation';

const logger = makeDomainLogger(consoleAdapter, 'migrations');

export async function up(connection: Knex): Promise<void> {
  // Add uuid as primary on affiliations, drop existing primary key
  // Add membership status enum field
  // Drop updated field on affiliation
  await connection.schema.alterTable('affiliations', async table => {
    table.dropPrimary();
    table.uuid('id').primary().defaultTo(generateUuid()).unique().notNullable();
    table.enu('membershipStatus', Object.values(MembershipStatus)).defaultTo(MembershipStatus.Pending).notNullable();
    table.dropColumn('updatedAt');
  });
  logger.info('Altered affiliations table.');

  // Add deactivation tracking fields to organizations
  await connection.schema.alterTable('organizations', table => {
    table.timestamp('deactivatedOn');
    table.uuid('deactivatedBy').references('id').inTable('users');
  });
  logger.info('Altered organizations table.');

  // Rename title -> jobTitle in users
  await connection.schema.alterTable('users', table => {
    table.renameColumn('title', 'jobTitle');
  });
  logger.info('Altered users table.');
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable('users', table => {
    table.renameColumn('jobTitle', 'title');
  });
  logger.info('Reverted users table.');

  await connection.schema.alterTable('organizations', table => {
    table.dropColumn('deactivatedOn');
    table.dropColumn('deactivatedBy');
  });
  logger.info('Reverted organizations table.');

  await connection.schema.alterTable('affiliations', async table => {
    table.dropPrimary();
    table.dropColumn('id');
    table.primary(['user', 'organization']);
    table.dropColumn('membershipStatus');
    table.timestamp('updatedAt').defaultTo(new Date().toDateString()).notNullable();
  });
  logger.info('Reverted affiliations table.');
}
