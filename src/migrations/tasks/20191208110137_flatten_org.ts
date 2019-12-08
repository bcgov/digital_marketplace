import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import Knex from 'knex';

const logger = makeDomainLogger(consoleAdapter, 'migrations');

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable('organizations', table => {
    // Switch logo image to file reference from url string
    table.uuid('logoImageUrl').references('id').inTable('files').nullable().alter();
    table.renameColumn('logoImageUrl', 'logoImageFile');

    // Drop foreign keys for addresses and contacts
    table.dropColumn('legalAddress');
    table.dropColumn('contact');

    // Add updated timestamp for audit purposes
    table.timestamp('updatedAt').notNullable();

    // Add contact and address columns to organizations table
    table.string('streetAddress1').notNullable();
    table.string('streetAddress2');
    table.string('city').notNullable();
    table.string('region').notNullable();
    table.string('mailCode').notNullable();
    table.string('country').notNullable();
    table.string('contactName').notNullable();
    table.string('contactTitle');
    table.string('contactEmail').notNullable();
    table.string('contactPhone');
  });
  logger.info('Altered organizations table.');

  await connection.schema.alterTable('affiliations', table => {
    table.timestamp('updatedAt').notNullable();
  });
  logger.info('Altered affiliations table.');

  // Drop address and contact tables since they are rolled into organizations table now
  await connection.schema.dropTable('addresses');
  logger.info('Dropped addresses table.');
  await connection.schema.dropTable('contacts');
  logger.info('Dropped contacts table.');
}

export async function down(connection: Knex): Promise<void> {

  await connection.schema.createTable('addresses', table => {
    table.uuid('id').primary().unique().notNullable();
    table.string('streetAddress1');
    table.string('streetAddress2');
    table.string('city');
    table.string('region');
    table.string('mailCode');
    table.string('country');
  });
  logger.info('Re-created addresses table.');

  await connection.schema.createTable('contacts', table => {
    table.uuid('id').primary().unique().notNullable();
    table.string('name').notNullable();
    table.string('title');
    table.string('email');
    table.string('phone');
  });
  logger.info('Re-created contacts table.');

  await connection.schema.alterTable('organizations', table => {
    table.dropForeign(['logoImageUrl']);
    table.renameColumn('logoImageFile', 'logoImageUrl');
    table.dropColumn('updatedAt');
    table.dropColumn('streetAddress1');
    table.dropColumn('streetAddress2');
    table.dropColumn('city');
    table.dropColumn('region');
    table.dropColumn('mailCode');
    table.dropColumn('country');
    table.dropColumn('contactName');
    table.dropColumn('contactTitle');
    table.dropColumn('contactEmail');
    table.dropColumn('contactPhone');
    table.uuid('legalAddress').references('id').inTable('addresses');
    table.uuid('contact').references('id').inTable('contacts');
  });
  logger.info('Reverted organizations table.');

  await connection.schema.alterTable('affiliations', table => {
    table.dropColumn('updatedAt');
  });
  logger.info('Reverted affiliations table.');
}
