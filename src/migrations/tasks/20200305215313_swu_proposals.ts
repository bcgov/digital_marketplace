import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import Knex from 'knex';

const logger = makeDomainLogger(consoleAdapter, 'migrations');

enum SWUProposalStatus {
  Draft        = 'DRAFT',
  Submitted    = 'SUBMITTED',
  UnderReview  = 'UNDER_REVIEW',
  Evaluated    = 'EVALUATED',
  Awarded      = 'AWARDED',
  NotAwarded   = 'NOT_AWARDED',
  Disqualified = 'DISQUALIFIED',
  Withdrawn    = 'WITHDRAWN'
}

enum SWUProposalEvent {
  QuestionsScoreEntered = 'QUESTIONS_SCORE_ENTERED',
  ChallengeScoreEntered = 'CHALLENGE_SCORE_ENTERED',
  ScenarioScoreEntered = 'SCENARIO_SCORE_ENTERED',
  PriceScoreEntered = 'PRICE_SCORE_ENTERED'
}

enum SWUProposalPhaseType {
  Inception = 'INCEPTION',
  Prototype = 'PROTOTYPE',
  Implementation = 'IMPLEMENTATION'
}

export async function up(connection: Knex): Promise<void> {
  await connection.schema.createTable('swuProposals', table => {
    table.uuid('id').primary().unique().notNullable();
    table.timestamp('createdAt').notNullable();
    table.uuid('createdBy').references('id').inTable('users').notNullable();
    table.timestamp('updatedAt').notNullable();
    table.uuid('updatedBy').references('id').inTable('users').notNullable();
    table.integer('questionsScore');
    table.integer('challengeScore');
    table.integer('scenarioScore');
    table.integer('priceScore');
  });
  logger.info('Created swuProposals table.');

  await connection.schema.createTable('swuProposalStatuses', table => {
    table.uuid('id').primary().unique().notNullable();
    table.timestamp('createdAt').notNullable();
    table.uuid('createdBy').references('id').inTable('users').notNullable();
    table.uuid('proposal').references('id').inTable('swuProposals').notNullable().onDelete('CASCADE');
    table.enu('status', Object.values(SWUProposalStatus)).nullable();
    table.enu('event', Object.values(SWUProposalEvent)).nullable();
    table.string('note');
  });

  await connection.schema.raw(`
    ALTER TABLE "swuProposalStatuses"
    ADD CONSTRAINT "eitherEventOrStatus" check(
      ("event" IS NOT NULL AND "status" IS NULL)
      OR
      ("event" IS NULL AND "status" IS NOT NULL)
    )
  `);

  logger.info('Created swuProposalStatuses table.');

  await connection.schema.createTable('swuProposalAttachments', table => {
    table.uuid('proposal').references('id').inTable('cwuProposals').notNullable().onDelete('CASCADE');
    table.uuid('file').references('id').inTable('files').notNullable();
    table.primary(['proposal', 'file']);
  });

  logger.info('Created swuProposalAttachments table.');

  await connection.schema.createTable('swuProposalPhases', table => {
    table.uuid('id').primary().unique().notNullable();
    table.uuid('proposal').references('id').inTable('swuProposals').notNullable().onDelete('CASCADE');
    table.enu('phase', Object.values(SWUProposalPhaseType)).notNullable();
    table.integer('proposedCost').notNullable();
  });
  logger.info('Created swuProposalPhases table.');

  await connection.schema.createTable('swuProposalTeamMembers', table => {
    table.uuid('member').references('id').inTable('users').notNullable();
    table.uuid('phase').references('id').inTable('swuProposalPhases').notNullable();
    table.boolean('scrumMaster').defaultTo(false).notNullable();
    table.boolean('pending').defaultTo(false).notNullable();
    table.primary(['member', 'phase']);
  });
  logger.info('Created swuProposalTeamMembers table.');

  await connection.schema.createTable('swuProposalReferences', table => {
    table.uuid('proposal').references('id').inTable('swuProposals').notNullable().onDelete('CASCADE');
    table.integer('order').notNullable();
    table.string('name').notNullable();
    table.string('company').notNullable();
    table.string('phone').notNullable();
    table.string('email').notNullable();
    table.primary(['proposal', 'order']);
  });
  logger.info('Created swuProposalReferences table.');

  await connection.schema.createTable('swuTeamQuestionResponses', table => {
    table.uuid('proposal').references('id').inTable('swuProposals').notNullable().onDelete('CASCADE');
    table.integer('order').notNullable();
    table.string('response', 5000);
  });
  logger.info('Created swuTeamQuestionResponses table.');
}

// tslint:disable-next-line: no-empty
export async function down(connection: Knex): Promise<void> {
}
