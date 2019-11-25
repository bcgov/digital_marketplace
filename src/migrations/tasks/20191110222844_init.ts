import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import Knex from 'knex';
import { MembershipType, UserStatus, UserType } from 'shared/lib/types';

const logger = makeDomainLogger(consoleAdapter, 'migrations');

export async function up(connection: Knex): Promise<void> {
    // Initialize tables

    // Users
    await connection.schema.createTable('users', table => {
        table.uuid('id').primary().unique().notNullable();
        table.timestamp('createdAt').notNullable();
        table.timestamp('updatedAt').notNullable();
        table.enu('type', Object.values(UserType)).notNullable();
        table.enu('status', Object.values(UserStatus)).notNullable();
        table.string('name').notNullable();
        table.string('email');
        table.string('avatarImageUrl');
        table.string('title');
        table.boolean('notificationsOn').notNullable();
        table.boolean('acceptedTerms').notNullable();
        table.string('idpUsername').notNullable();

        // Username, UserType pair should be unique
        table.unique(['type', 'idpUsername']);

        // Indices
        table.index(['idpUsername']);
        table.index(['notificationsOn']);
    });
    logger.info('Created users table');

    // Session
    await connection.schema.createTable('sessions', table => {
        table.uuid('id').primary().unique().notNullable();
        table.string('accessToken', 2500);
        table.timestamp('createdAt').notNullable();
        table.timestamp('updatedAt').notNullable();
        table.uuid('user').references('id').inTable('users');
    });
    logger.info('Created sessions table');

    // Address
    await connection.schema.createTable('addresses', table => {
        table.uuid('id').primary().unique().notNullable();
        table.string('streetAddress1');
        table.string('streetAddress2');
        table.string('city');
        table.string('region');
        table.string('mailCode');
        table.string('country');
    });
    logger.info('Created addresses table');

    // Contacts
    await connection.schema.createTable('contacts', table => {
        table.uuid('id').primary().unique().notNullable();
        table.string('name').notNullable();
        table.string('title');
        table.string('email');
        table.string('phone');
    });
    logger.info('Created contacts table');

    // Companies
    await connection.schema.createTable('organizations', table => {
        table.uuid('id').primary().unique().notNullable();
        table.timestamp('createdAt').notNullable();
        table.string('legalName').notNullable();
        table.uuid('legalAddress').references('id').inTable('addresses');
        table.uuid('contact').references('id').inTable('contacts');
        table.string('logoImageUrl');
        table.string('websiteUrl');

        // Indices
        table.index(['legalName']);
    });
    logger.info('Created organizations table');

    // Affiliations
    await connection.schema.createTable('affiliations', table => {
        table.uuid('user').references('id').inTable('users');
        table.uuid('organization').references('id').inTable('organizations');
        table.timestamp('createdAt').notNullable();
        table.enu('membershipType', Object.values(MembershipType));
        table.primary(['user', 'organization']);
    });
    logger.info('Created affiliations table');
}

export async function down(connection: Knex): Promise<void> {
    await connection.schema.dropTable('affiliations');
    await connection.schema.dropTable('organizations');
    await connection.schema.dropTable('contacts');
    await connection.schema.dropTable('addresses');
    await connection.schema.dropTable('sessions');
    await connection.schema.dropTable('users');
}
