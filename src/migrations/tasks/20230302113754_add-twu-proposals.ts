import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";

makeDomainLogger(consoleAdapter, "migrations");

// enum TWUProposalStatus {
//   Draft = "DRAFT",
//   Submitted = "SUBMITTED",
//   UnderReviewResourceQuestions = "UNDER_REVIEW_QUESTIONS",
//   EvaluatedResourceQuestions = "EVALUATED_QUESTIONS",
//   UnderReviewChallenge = "UNDER_REVIEW_CHALLENGE",
//   EvaluatedChallenge = "EVALUATED_CHALLENGE",
//   Awarded = "AWARDED",
//   NotAwarded = "NOT_AWARDED",
//   Disqualified = "DISQUALIFIED",
//   Withdrawn = "WITHDRAWN"
// }

export async function up(connection: Knex): Promise<void> {} // eslint-disable-line

export async function down(connection: Knex): Promise<void> {} // eslint-disable-line
