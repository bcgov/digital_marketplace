import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import Knex from 'knex';
import { generateSQLAlterTableEnums } from 'migrations/utils';

const logger = makeDomainLogger(consoleAdapter, 'migrations', 'development');

enum OldCWUOpportunityEvent {
  Edited = 'EDITED',
  AddendumAdded = 'ADDENDUM_ADDED'
}

enum OldCWUProposalEvent {
  ScoreEntered = 'SCORE_ENTERED'
}

enum CWUOpportunityEvent {
  Edited = 'EDITED',
  AddendumAdded = 'ADDENDUM_ADDED',
  NoteAdded = 'NOTE_ADDED'
}

enum CWUProposalEvent {
  ScoreEntered = 'SCORE_ENTERED',
  NoteAdded = 'NOTE_ADDED'
}

enum OldSWUProposalEvent {
  QuestionsScoreEntered = 'QUESTIONS_SCORE_ENTERED',
  ChallengeScoreEntered = 'CHALLENGE_SCORE_ENTERED',
  ScenarioScoreEntered = 'SCENARIO_SCORE_ENTERED',
  PriceScoreEntered = 'PRICE_SCORE_ENTERED'
}

enum OldSWUOpportunityEvent {
  Edited = 'EDITED',
  AddendumAdded = 'ADDENDUM_ADDED'
}

enum SWUOpportunityEvent {
  Edited = 'EDITED',
  AddendumAdded = 'ADDENDUM_ADDED',
  NoteAdded = 'NOTE_ADDED'
}

enum SWUProposalEvent {
  QuestionsScoreEntered = 'QUESTIONS_SCORE_ENTERED',
  ChallengeScoreEntered = 'CHALLENGE_SCORE_ENTERED',
  ScenarioScoreEntered = 'SCENARIO_SCORE_ENTERED',
  PriceScoreEntered = 'PRICE_SCORE_ENTERED',
  NoteAdded = 'NOTE_ADDED'
}

export async function up(connection: Knex): Promise<void> {
  // Modify constraints on status tables for opportunities and proposals to allow for new event type
  await connection.schema.raw(generateSQLAlterTableEnums('cwuOpportunityStatuses', 'event', Object.values(CWUOpportunityEvent)));
  logger.info('Completed modifying cwuOpportunityStatuses table.');

  await connection.schema.raw(generateSQLAlterTableEnums('cwuProposalStatuses', 'event', Object.values(CWUProposalEvent)));
  logger.info('Completed modifying cwuProposalStatuses table.');

  await connection.schema.raw(generateSQLAlterTableEnums('swuOpportunityStatuses', 'event', Object.values(SWUOpportunityEvent)));
  logger.info('Completed modifying swuOpportunityStatuses table.');

  await connection.schema.raw(generateSQLAlterTableEnums('swuProposalStatuses', 'event', Object.values(SWUProposalEvent)));
  logger.info('Completed modifying swuProposalStatuses table.');

  // Create new note attachments tables
  await connection.schema.createTable('cwuOpportunityNoteAttachments', table => {
    table.uuid('event').references('id').inTable('cwuOpportunityStatuses').notNullable();
    table.uuid('file').references('id').inTable('files').notNullable();
    table.primary(['event', 'file']);
  });
  logger.info('Created table cwuOpportunityNoteAttachments');

  await connection.schema.createTable('cwuProposalNoteAttachments', table => {
    table.uuid('event').references('id').inTable('cwuProposalStatuses').notNullable();
    table.uuid('file').references('id').inTable('files').notNullable();
    table.primary(['event', 'file']);
  });
  logger.info('Created table cwuProposalNoteAttachments');

  await connection.schema.createTable('swuOpportunityNoteAttachments', table => {
    table.uuid('event').references('id').inTable('swuOpportunityStatuses').notNullable();
    table.uuid('file').references('id').inTable('files').notNullable();
    table.primary(['event', 'file']);
  });
  logger.info('Created table swuOpportunityNoteAttachments');

  await connection.schema.createTable('swuProposalNoteAttachments', table => {
    table.uuid('event').references('id').inTable('swuProposalStatuses').notNullable();
    table.uuid('file').references('id').inTable('files').notNullable();
    table.primary(['event', 'file']);
  });
  logger.info('Created table swuProposalNoteAttachments');
}

export async function down(connection: Knex): Promise<void> {
  // Drop note attachment tables.
  await connection.schema.dropTable('cwuOpportunityNoteAttachments');
  logger.info('Dropped table cwuOpportunityNoteAttachments.');

  await connection.schema.dropTable('cwuProposalNoteAttachments');
  logger.info('Dropped table cwuProposalNoteAttachments.');

  await connection.schema.dropTable('swuOpportunityNoteAttachments');
  logger.info('Dropped table swuOpportunityNoteAttachments.');

  await connection.schema.dropTable('swuProposalNoteAttachments');
  logger.info('Dropped table swuProposalNoteAttachments.');

  // Revert modifications to opportunity and proposal status tables.
  // Warning - destructive operation.  This will remove any rows that use non-existant enums.
  await connection('cwuOpportunityStatuses').delete().whereNotIn('event', Object.values(OldCWUOpportunityEvent));
  await connection.schema.raw(generateSQLAlterTableEnums('cwuOpportunityStatuses', 'event', Object.values(OldCWUOpportunityEvent)));
  logger.info('Completed reverting cwuOpportunityStatuses table.');

  await connection('cwuProposalStatuses').delete().whereNotIn('event', Object.values(OldCWUProposalEvent));
  await connection.schema.raw(generateSQLAlterTableEnums('cwuProposalStatuses', 'event', Object.values(OldCWUProposalEvent)));
  logger.info('Completed reverting cwuProposalStatuses table.');

  await connection('swuOpportunityStatuses').delete().whereNotIn('event', Object.values(OldSWUOpportunityEvent));
  await connection.schema.raw(generateSQLAlterTableEnums('swuOpportunityStatuses', 'event', Object.values(OldSWUOpportunityEvent)));
  logger.info('Completed reverting swuOpportunityStatuses table.');

  await connection('swuProposalStatuses').delete().whereNotIn('event', Object.values(OldSWUProposalEvent));
  await connection.schema.raw(generateSQLAlterTableEnums('swuProposalStatuses', 'event', Object.values(OldSWUProposalEvent)));
  logger.info('Completed reverting swuProposalStatuses table.');
}
