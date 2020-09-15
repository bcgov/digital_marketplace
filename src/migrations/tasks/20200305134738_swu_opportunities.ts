import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import Knex from 'knex';

const logger = makeDomainLogger(consoleAdapter, 'migrations', 'development');

enum SWUOpportunityStatus {
  Draft = 'DRAFT',
  UnderReview = 'UNDER_REVIEW',
  Published = 'PUBLISHED',
  EvaluationTeamQuestions = 'EVAL_QUESTIONS',
  EvaluationCodeChallenge = 'EVAL_CC',
  EvaluationTeamScenario = 'EVAL_SCENARIO',
  Awarded = 'AWARDED',
  Suspended = 'SUSPENDED',
  Canceled = 'CANCELED'
}

enum SWUOpportunityEvent {
  Edited = 'EDITED',
  AddendumAdded = 'ADDENDUM_ADDED'
}

enum SWUOpportunityPhaseType {
  Inception = 'INCEPTION',
  Prototype = 'PROTOTYPE',
  Implementation = 'IMPLEMENTATION'
}

export async function up(connection: Knex): Promise<void> {
  await connection.schema.createTable('swuOpportunities', table => {
    table.uuid('id').primary().unique().notNullable();
    table.timestamp('createdAt').notNullable();
    table.uuid('createdBy').references('id').inTable('users').notNullable();
  });
  logger.info('Created swuOpportunities table.');

  await connection.schema.createTable('swuOpportunityVersions', table => {
    table.uuid('id').primary().unique().notNullable();
    table.timestamp('createdAt').notNullable();
    table.uuid('createdBy').references('id').inTable('users').notNullable();
    table.uuid('opportunity').references('id').inTable('swuOpportunities').notNullable().onDelete('CASCADE');
    table.string('title').notNullable();
    table.string('teaser').notNullable();
    table.boolean('remoteOk').defaultTo(false).notNullable();
    table.string('remoteDesc').notNullable();
    table.string('location').notNullable();
    table.integer('totalMaxBudget').notNullable();
    table.integer('minTeamMembers').notNullable();
    table.specificType('mandatorySkills', 'text ARRAY').notNullable();
    table.specificType('optionalSkills', 'text ARRAY').notNullable();
    table.string('description', 10000).notNullable();
    table.timestamp('proposalDeadline').notNullable();
    table.timestamp('assignmentDate').notNullable();
    table.integer('questionsWeight').notNullable();
    table.integer('codeChallengeWeight').notNullable();
    table.integer('scenarioWeight').notNullable();
    table.integer('priceWeight').notNullable();
  });
  logger.info('Created swuOpportunityVersions table.');

  await connection.schema.createTable('swuOpportunityStatuses', table => {
    table.uuid('id').primary().unique().notNullable();
    table.timestamp('createdAt').notNullable();
    table.uuid('createdBy').references('id').inTable('users').notNullable();
    table.uuid('opportunity').references('id').inTable('swuOpportunities').notNullable().onDelete('CASCADE');
    table.enu('status', Object.values(SWUOpportunityStatus)).nullable();
    table.enu('event', Object.values(SWUOpportunityEvent)).nullable();
    table.string('note');
  });

  await connection.schema.raw(`
    ALTER TABLE "swuOpportunityStatuses"
    ADD CONSTRAINT "eitherEventOrStatus" check(
      ("event" IS NOT NULL AND "status" IS NULL)
      OR
      ("event" IS NULL AND "status" IS NOT NULL)
    )
  `);

  logger.info('Created swuOpportunityStatuses table.');

  await connection.schema.createTable('swuOpportunityAttachments', table => {
    table.uuid('id').primary().unique().notNullable();
    table.uuid('opportunityVersion').references('id').inTable('swuOpportunityVersions').notNullable().onDelete('CASCADE');
    table.uuid('file').references('id').inTable('files').notNullable();
  });

  logger.info('Created swuOpportunityAttachments table.');

  await connection.schema.createTable('swuOpportunityAddenda', table => {
    table.uuid('id').primary().unique().notNullable();
    table.uuid('opportunity').references('id').inTable('swuOpportunities').notNullable().onDelete('CASCADE');
    table.timestamp('createdAt').notNullable();
    table.uuid('createdBy').references('id').inTable('users').notNullable();
    table.string('description').notNullable();
  });
  logger.info('Created swuOpportunityAddenda table.');

  await connection.schema.createTable('swuOpportunityPhases', table => {
    table.uuid('id').primary().unique().notNullable();
    table.uuid('opportunityVersion').references('id').inTable('swuOpportunityVersions').notNullable().onDelete('CASCADE');
    table.enu('phase', Object.values(SWUOpportunityPhaseType)).notNullable();
    table.timestamp('startDate').notNullable();
    table.timestamp('completionDate').notNullable();
    table.integer('maxBudget').notNullable();
    table.timestamp('createdAt').notNullable();
    table.uuid('createdBy').references('id').inTable('users').notNullable();
    table.timestamp('updatedAt').notNullable();
    table.uuid('updatedBy').references('id').inTable('users').notNullable();

    table.unique(['opportunityVersion', 'phase']);
  });
  logger.info('Created swuOpportunityPhases table.');

  await connection.schema.createTable('swuPhaseCapabilities', table => {
    table.uuid('phase').references('id').inTable('swuOpportunityPhases').notNullable().onDelete('CASCADE');
    table.string('capability').notNullable();
    table.boolean('fullTime').defaultTo(false).notNullable();
    table.timestamp('createdAt').notNullable();
    table.uuid('createdBy').references('id').inTable('users').notNullable();
    table.timestamp('updatedAt').notNullable();
    table.uuid('updatedBy').references('id').inTable('users').notNullable();
    table.primary(['phase', 'capability']);
  });
  logger.info('Created swuPhaseCapabilities table.');

  await connection.schema.createTable('swuTeamQuestions', table => {
    table.uuid('opportunityVersion').references('id').inTable('swuOpportunityVersions').notNullable().onDelete('CASCADE');
    table.string('question', 1000).notNullable();
    table.string('guideline', 1000).notNullable();
    table.integer('score').notNullable();
    table.integer('wordLimit').notNullable();
    table.integer('order').notNullable();
    table.timestamp('createdAt').notNullable();
    table.uuid('createdBy').references('id').inTable('users').notNullable();
    table.timestamp('updatedAt').notNullable();
    table.uuid('updatedBy').references('id').inTable('users').notNullable();
    table.primary(['order', 'opportunityVersion']);
  });
  logger.info('Created swuTeamQuestions table.');
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.dropTable('swuTeamQuestions');
  logger.info('Dropped table swuTeamQuestions');
  await connection.schema.dropTable('swuPhaseCapabilities');
  logger.info('Dropped table swuPhaseCapabilities');
  await connection.schema.dropTable('swuOpportunityPhases');
  logger.info('Dropped table swuOpportunityPhases');
  await connection.schema.dropTable('swuOpportunityAddenda');
  logger.info('Dropped table swuOpportunityAddenda');
  await connection.schema.dropTable('swuOpportunityAttachments');
  logger.info('Dropped table swuOpportunityAttachments');
  await connection.schema.dropTable('swuOpportunityStatuses');
  logger.info('Dropped table swuOpportunityStatuses');
  await connection.schema.dropTable('swuOpportunityVersions');
  logger.info('Dropped table swuOpportunityVersions');
  await connection.schema.dropTable('swuOpportunities');
  logger.info('Dropped table swuOpportunities');
}
