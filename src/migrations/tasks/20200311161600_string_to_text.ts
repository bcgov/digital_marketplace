import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import Knex from 'knex';

const logger = makeDomainLogger(consoleAdapter, 'migrations');

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable('cwuOpportunityAddenda', table => {
    table.text('description').notNullable().alter();
  });
  logger.info('Modified cwuOpportunityAddenda table.');

  await connection.schema.alterTable('cwuOpportunityVersions', table => {
    table.text('description').notNullable().alter();
    table.text('acceptanceCriteria').notNullable().alter();
    table.text('evaluationCriteria').notNullable().alter();
  });
  logger.info('Modified cwuOpportunityVersions table.');

  await connection.schema.alterTable('cwuProposals', table => {
    table.text('proposalText').notNullable().alter();
    table.text('additionalComments').notNullable().alter();
  });
  logger.info('Modified cwuProposals table.');

  await connection.schema.alterTable('swuOpportunityAddenda', table => {
    table.text('description').notNullable().alter();
  });
  logger.info('Modified swuOpportunityAddenda table.');

  await connection.schema.alterTable('swuOpportunityVersions', table => {
    table.text('description').notNullable().alter();
  });
  logger.info('Modified swuOpportunityVersions table.');

  await connection.schema.alterTable('swuTeamQuestionResponses', table => {
    table.text('response').notNullable().alter();
  });
  logger.info('Modified swuTeamQuestionResponses');

  await connection.schema.alterTable('swuTeamQuestions', table => {
    table.text('question').notNullable().alter();
    table.text('guideline').notNullable().alter();
  });
  logger.info('Modified swuTeamQuestions');
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable('cwuOpportunityAddenda', table => {
    table.string('description').notNullable().alter();
  });
  logger.info('Reverted cwuOpportunityAddenda table.');

  await connection.schema.alterTable('cwuOpportunityVersions', table => {
    table.string('description').notNullable().alter();
    table.string('acceptanceCriteria').notNullable().alter();
    table.string('evaluationCriteria').notNullable().alter();
  });
  logger.info('Reverted cwuOpportunityVersions table.');

  await connection.schema.alterTable('cwuProposals', table => {
    table.string('proposalText').notNullable().alter();
    table.string('additionalComments').notNullable().alter();
  });
  logger.info('Reverted cwuProposals table.');

  await connection.schema.alterTable('swuOpportunityAddenda', table => {
    table.string('description').notNullable().alter();
  });
  logger.info('Reverted swuOpportunityAddenda table.');

  await connection.schema.alterTable('swuOpportunityVersions', table => {
    table.string('description').notNullable().alter();
  });
  logger.info('Reverted swuOpportunityVersions table.');

  await connection.schema.alterTable('swuTeamQuestionResponses', table => {
    table.string('response').notNullable().alter();
  });
  logger.info('Reverted swuTeamQuestionResponses');

  await connection.schema.alterTable('swuTeamQuestions', table => {
    table.string('question').notNullable().alter();
    table.string('guideline').notNullable().alter();
  });
  logger.info('Reverted swuTeamQuestions');
}
