import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import Knex from 'knex';
import { generateSQLAlterTableEnums } from 'migrations/utils';

const logger = makeDomainLogger(consoleAdapter, 'migrations', 'development');

export enum CWUOpportunityStatus {
  Draft = 'DRAFT',
  Published = 'PUBLISHED',
  Evaluation = 'EVALUATION',
  ScoresLocked = 'SCORES_LOCKED',
  Awarded = 'AWARDED',
  Suspended = 'SUSPENDED',
  Canceled = 'CANCELED'
}

export enum OldCWUOpportunityStatus {
  Draft = 'DRAFT',
  Published = 'PUBLISHED',
  Evaluation = 'EVALUATION',
  Scored = 'SCORED',
  Awarded = 'AWARDED',
  Suspended = 'SUSPENDED',
  Canceled = 'CANCELED'
}

export async function up(connection: Knex): Promise<void> {
  // Modify constraints on status tables for CWU opportunities to allow for new 'Scored' status type
  await connection.schema.raw(generateSQLAlterTableEnums('cwuOpportunityStatuses', 'status', Object.values(CWUOpportunityStatus)));
  logger.info('Completed modifying cwuOpportunityStatuses table.');
}

export async function down(connection: Knex): Promise<void> {
  // Revert modifications to CWU opportunity status tables.
  await connection.schema.raw(generateSQLAlterTableEnums('cwuOpportunityStatuses', 'status', Object.values(OldCWUOpportunityStatus)));
  logger.info('Completed reverting cwuOpportunityStatuses table.');
}
