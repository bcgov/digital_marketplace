import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import Knex from 'knex';
import { OpportunityStatus } from 'shared/lib/resources/cwu-opportunity';
import { ProposalStatus } from 'shared/lib/resources/cwu-proposal';

const logger = makeDomainLogger(consoleAdapter, 'migrations');

export async function up(connection: Knex): Promise<void> {
  // Create CWUOpportunity table
  await connection.schema.createTable('cwuOpportunities', table => {
    table.uuid('id').primary().unique().notNullable();
    table.timestamp('createdAt').notNullable();
    table.timestamp('updatedAt').notNullable();
    table.uuid('createdBy').references('id').inTable('users');
    table.uuid('updatedBy').references('id').inTable('users');
  });
  logger.info('Created cwuOpportunities table.');

  // Create CWUOpportunityVersion table
  await connection.schema.createTable('cwuOpportunityVersions', table => {
    table.uuid('id').primary().unique().notNullable();
    table.timestamp('createdAt').notNullable();
    table.uuid('createdBy').references('id').inTable('users').notNullable();
    table.uuid('opportunity').references('id').inTable('cwuOpportunities');
    table.string('title');
    table.string('teaser');
    table.boolean('remoteOk').defaultTo(false);
    table.string('remoteDesc');
    table.string('location');
    table.integer('reward');
    table.specificType('skills', 'text ARRAY');
    table.string('description');
    table.timestamp('proposalDeadline');
    table.timestamp('assignmentDate');
    table.timestamp('startDate');
    table.timestamp('completionDate');
    table.string('submissionInfo');
    table.string('acceptanceCriteria');
    table.string('evaluationCriteria');
  });
  logger.info('Created cwuOpportunityVersions table.');

  // Create CWUOpportunityStatus table
  await connection.schema.createTable('cwuOpportunityStatuses', table => {
    table.uuid('id').primary().unique().notNullable();
    table.timestamp('createdAt').notNullable();
    table.uuid('createdBy').references('id').inTable('users').notNullable();
    table.uuid('opportunity').references('id').inTable('cwuOpportunities');
    table.enu('status', Object.values(OpportunityStatus)).notNullable();
    table.string('note');
  });
  logger.info('Created cwuOpportunityStatuses table.');

  // Create CWUOpportunityAttachment table
  await connection.schema.createTable('cwuOpportunityAttachments', table => {
    table.uuid('id').primary().unique().notNullable();
    table.timestamp('createdAt').notNullable();
    table.uuid('createdBy').references('id').inTable('users').notNullable();
    table.uuid('opportunityVersion').references('id').inTable('cwuOpportunityVersions').notNullable();
    table.uuid('file').references('id').inTable('files').notNullable();
  });
  logger.info('Created cwuOpportunityAttachments table.');

  // Create CWUOpportunityAddendum table
  await connection.schema.createTable('cwuOpportunityAddenda', table => {
    table.uuid('id').primary().unique().notNullable();
    table.uuid('opportunity').references('id').inTable('cwuOpportunities').notNullable();
    table.timestamp('createdAt').notNullable();
    table.uuid('createdBy').references('id').inTable('users').notNullable();
    table.string('description').notNullable();
  });
  logger.info('Created cwuOpportunityAddenda table.');

  // Create CWUProposal table
  await connection.schema.createTable('cwuProposals', table => {
    table.uuid('id').primary().unique().notNullable();
    table.timestamp('createdAt').notNullable();
    table.uuid('createdBy').references('id').inTable('users').notNullable();
    table.timestamp('updatedAt').notNullable();
    table.uuid('updatedBy').references('id').inTable('users').notNullable();
    table.string('proposalText');
    table.string('additionalComments');
    table.uuid('proponentOrg').references('id').inTable('organizations');
    table.float('score');
  });
  logger.info('Created cwuProposals table.');

  // Create CWUProponent table
  await connection.schema.createTable('cwuProponents', table => {
    table.uuid('id').primary().unique().notNullable();
    table.timestamp('createdAt').notNullable();
    table.uuid('createdBy').references('id').inTable('users').notNullable();
    table.timestamp('updatedAt').notNullable();
    table.uuid('updatedBy').references('id').inTable('users').notNullable();
    table.string('legalName').notNullable();
    table.string('email').notNullable();
    table.string('phone');
    table.string('streetAddress1').notNullable();
    table.string('streetAddress2');
    table.string('city').notNullable();
    table.string('region').notNullable();
    table.string('mailCode').notNullable();
    table.string('country').notNullable();
  });
  logger.info('Created cwuProponents table.');

  // Add foreign key relationship Proposals --> Proponents
  await connection.schema.alterTable('cwuProposals', table => {
    table.uuid('proponent').references('id').inTable('cwuProponents');
  });
  logger.info('Foreign key \'proponent\' added to cwuProposals table.');

  // Add constraint to CWUProposal table (proponent is either individual or org - not both)
  await connection.schema.raw(`
  ALTER TABLE "cwuProposals"
  ADD CONSTRAINT "eitherProponentOrOrg" check(
    ("proponent" IS NOT NULL AND "proponentOrg" IS NULL)
    OR
    ("proponent" IS NULL AND "proponentOrg" IS NOT NULL)
  )
  `);
  logger.info('Added constraint \'eitherProponentOrOrg\' to cwuProposals table.');

  // Create CWUProposalAttachment table
  await connection.schema.createTable('cwuProposalAttachments', table => {
    table.uuid('id').primary().unique().notNullable();
    table.timestamp('createdAt').notNullable();
    table.uuid('createdBy').references('id').inTable('users').notNullable();
    table.uuid('proposal').references('id').inTable('cwuProposals').notNullable();
    table.uuid('file').references('id').inTable('files').notNullable();
  });
  logger.info('Created cwuProposalAttachments table.');

  // Create CWUProposalStatus table
  await connection.schema.createTable('cwuProposalStatuses', table => {
    table.uuid('id').primary().unique().notNullable();
    table.timestamp('createdAt').notNullable();
    table.uuid('createdBy').references('id').inTable('users').notNullable();
    table.uuid('proposal').references('id').inTable('cwuProposals').notNullable();
    table.enu('status', Object.values(ProposalStatus)).notNullable();
  });
  logger.info('Created cwuProposalStatuses table.');
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.dropTable('cwuProposalStatuses');
  await connection.schema.dropTable('cwuProposalAttachments');
  await connection.schema.raw(`
    ALTER TABLE "cwuProposals"
    DROP CONSTRAINT "eitherProponentOrOrg"
  `);
  await connection.schema.alterTable('cwuProposals', table => {
    table.dropColumn('proponent');
  });
  await connection.schema.dropTable('cwuProponents');
  await connection.schema.dropTable('cwuProposals');
  await connection.schema.dropTable('cwuOpportunityAddenda');
  await connection.schema.dropTable('cwuOpportunityAttachments');
  await connection.schema.dropTable('cwuOpportunityStatuses');
  await connection.schema.dropTable('cwuOpportunityVersions');
  await connection.schema.dropTable('cwuOpportunities');
}
