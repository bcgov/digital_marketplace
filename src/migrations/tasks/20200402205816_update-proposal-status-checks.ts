import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import Knex from 'knex';

const logger = makeDomainLogger(consoleAdapter, 'migrations');

enum SWUProposalStatus {
  Draft                     = 'DRAFT',
  Submitted                 = 'SUBMITTED',
  UnderReviewTeamQuestions  = 'UNDER_REVIEW_QUESTIONS',
  EvaluatedTeamQuestions    = 'EVALUATED_QUESTIONS',
  UnderReviewCodeChallenge  = 'UNDER_REVIEW_CODE_CHALLENGE',
  EvaluatedCodeChallenge    = 'EVALUATED_CODE_CHALLENGE',
  UnderReviewTeamScenario   = 'UNDER_REVIEW_TEAM_SCENARIO',
  EvaluatedTeamScenario     = 'EVALUATED_TEAM_SCENARIO',
  Awarded                   = 'AWARDED',
  NotAwarded                = 'NOT_AWARDED',
  Disqualified              = 'DISQUALIFIED',
  Withdrawn                 = 'WITHDRAWN'
}

enum PreviousSWUProposalStatus {
  Draft        = 'DRAFT',
  Submitted    = 'SUBMITTED',
  UnderReview  = 'UNDER_REVIEW',
  Evaluated    = 'EVALUATED',
  Awarded      = 'AWARDED',
  NotAwarded   = 'NOT_AWARDED',
  Disqualified = 'DISQUALIFIED',
  Withdrawn    = 'WITHDRAWN'
}

export async function up(connection: Knex): Promise<void> {
  await connection.schema.raw(' \
    ALTER TABLE "swuProposalStatuses" \
    DROP CONSTRAINT "swuProposalStatuses_status_check" \
  ');

  await connection('swuProposalStatuses')
    .where({ status: PreviousSWUProposalStatus.UnderReview })
    .update({ status: SWUProposalStatus.UnderReviewTeamQuestions });

  await connection('swuProposalStatuses')
    .where({ status: PreviousSWUProposalStatus.Evaluated })
    .update({ status: SWUProposalStatus.EvaluatedTeamScenario });

  await connection.schema.raw(` \
    ALTER TABLE "swuProposalStatuses" \
    ADD CONSTRAINT "swuProposalStatuses_status_check" \
    CHECK (status IN ('${Object.values(SWUProposalStatus).join('\',\'')}')) \
  `);
  logger.info('Completed modifying swuProposalStatuses table.');
}

export async function down(connection: Knex): Promise<void> {
  // await connection.schema.alterTable('swuProposalStatuses', table => {
  //   table.enu('status', Object.values(PreviousSWUProposalStatus)).nullable().alter();
  // });
  await connection.schema.raw(' \
    ALTER TABLE "swuProposalStatuses" \
    DROP CONSTRAINT "swuProposalStatuses_status_check" \
  ');

  await connection('swuProposalStatuses')
    .where({ status: SWUProposalStatus.UnderReviewTeamQuestions })
    .update({ status: PreviousSWUProposalStatus.UnderReview });

  await connection('swuProposalStatuses')
    .where({ status: SWUProposalStatus.EvaluatedTeamScenario })
    .update({ status: PreviousSWUProposalStatus.Evaluated });

  await connection.schema.raw(` \
    ALTER TABLE "swuProposalStatuses" \
    ADD CONSTRAINT "swuProposalStatuses_status_check" \
    CHECK (status IN ('${Object.values(PreviousSWUProposalStatus).join('\',\'')}')) \
  `);
  logger.info('Completed reverting swuProposalStatuses table.');
}
