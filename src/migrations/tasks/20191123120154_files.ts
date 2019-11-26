import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import Knex from 'knex';
import { UserType } from 'shared/lib/resources/user';

const logger = makeDomainLogger(consoleAdapter, 'migrations');

export async function up(connection: Knex): Promise<void> {
    // File binaries
    await connection.schema.createTable('fileBlobs', table => {
        table.string('hash').primary().unique().notNullable();
        table.binary('blob').notNullable();
    });
    logger.info('Created fileBlobs table');

    // File meta-data
    await connection.schema.createTable('files', table => {
        table.uuid('id').primary().unique().notNullable();
        table.timestamp('createdAt').notNullable();
        table.uuid('createdBy').references('id').inTable('users').notNullable();
        table.string('name').notNullable();
        table.string('fileBlob').references('hash').inTable('fileBlobs');
    });
    logger.info('Created files table');

    // File read permissions
    await connection.schema.createTable('fileReadPermissions', table => {
        table.enu('userType', Object.values(UserType)).notNullable();
        table.uuid('file').references('id').inTable('files').notNullable();

        table.primary(['userType', 'file']);
    });
    logger.info('Created fileReadPermissions table');
}

export async function down(connection: Knex): Promise<void> {
    await connection.schema.dropTable('fileReadPermissions');
    await connection.schema.dropTable('files');
    await connection.schema.dropTable('fileBlobs');
}
