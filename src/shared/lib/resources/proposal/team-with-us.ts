import { compareNumbers, compareStrings, isDateInThePast } from "shared/lib";
import { FileRecord } from "shared/lib/resources/file";
import {
  TWUOpportunity,
  TWUOpportunitySlim,
  TWUResourceQuestion
} from "shared/lib/resources/opportunity/team-with-us";
import { OrganizationSlim } from "shared/lib/resources/organization";
import { UserSlim, UserType } from "shared/lib/resources/user";
import { ADT, BodyWithErrors, Comparison, Id } from "shared/lib/types";
import { ErrorTypeFrom } from "shared/lib/validation";

export const DEFAULT_TWU_PROPOSAL_TITLE = "Unknown";
export const NUM_SCORE_DECIMALS = 2;

export enum TWUProposalStatus {
  Draft = "DRAFT",
  Submitted = "SUBMITTED",
  UnderReviewResourceQuestions = "UNDER_REVIEW_QUESTIONS",
  EvaluatedResourceQuestions = "EVALUATED_QUESTIONS",
  UnderReviewChallenge = "UNDER_REVIEW_CHALLENGE",
  EvaluatedChallenge = "EVALUATED_CHALLENGE",
  Awarded = "AWARDED",
  NotAwarded = "NOT_AWARDED",
  Disqualified = "DISQUALIFIED",
  Withdrawn = "WITHDRAWN"
}

export enum TWUProposalEvent {
  QuestionsScoreEntered = "QUESTIONS_SCORE_ENTERED",
  ChallengeScoreEntered = "CHALLENGE_SCORE_ENTERED",
  PriceScoreEntered = "PRICE_SCORE_ENTERED"
}

/**
 * User-defined type guard to narrow raw input to a TWUProposalStatus.
 *
 * @see {@link https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates}
 *
 * @param raw - a string value
 * @returns boolean
 */
function isTWUProposalStatus(
  raw: string | TWUProposalStatus
): raw is TWUProposalStatus {
  return Object.values(TWUProposalStatus).includes(raw as TWUProposalStatus);
}

/**
 * Determines if a raw string is part of the enum TWUProposalStatus and returns
 * the passed value or null.
 *
 * @see {@link TWUProposalStatus}
 *
 * @param raw - a string value
 * @returns TWUProposalStatus | null
 */
export function parseTWUProposalStatus(raw: string): TWUProposalStatus | null {
  return isTWUProposalStatus(raw) ? raw : null;
}

function quantifyTWUProposalStatusForSort(a: TWUProposalStatus): number {
  // 0 = first
  switch (a) {
    case TWUProposalStatus.Awarded:
      return 0;
    case TWUProposalStatus.NotAwarded:
      return 1;
    case TWUProposalStatus.UnderReviewResourceQuestions:
    case TWUProposalStatus.EvaluatedResourceQuestions:
    case TWUProposalStatus.UnderReviewChallenge:
    case TWUProposalStatus.EvaluatedChallenge:
      return 2;
    case TWUProposalStatus.Withdrawn:
      return 3;
    case TWUProposalStatus.Disqualified:
      return 4;
    case TWUProposalStatus.Draft:
    case TWUProposalStatus.Submitted:
      return 5;
  }
}

export function compareTWUProposalStatuses(
  a: TWUProposalStatus,
  b: TWUProposalStatus
): Comparison {
  return compareNumbers(
    quantifyTWUProposalStatusForSort(a),
    quantifyTWUProposalStatusForSort(b)
  );
}

type TWUProposalScore = "totalScore" | "questionsScore" | "challengeScore";

export function compareTWUProposalsForPublicSector(
  a: TWUProposalSlim,
  b: TWUProposalSlim,
  byScore: TWUProposalScore
): Comparison {
  const statusComparison = compareTWUProposalStatuses(a.status, b.status);
  if (statusComparison !== 0) {
    return statusComparison;
  }
  // Compare by score.
  // Give precendence to scored proposals.
  const aScore = a[byScore];
  const bScore = b[byScore];
  if (aScore === undefined && bScore !== undefined) {
    return 1;
  }
  if (aScore !== undefined && bScore === undefined) {
    return -1;
  }
  if (aScore !== undefined && bScore !== undefined) {
    // If scores are not the same, sort by score, highest first.
    const result = (compareNumbers(aScore, bScore) * -1) as Comparison;
    if (result) {
      return result;
    }
  }
  // Fallback to sorting by proponent name.
  return compareStrings(getTWUProponentName(a), getTWUProponentName(b));
}

export interface TWUProposal {
  id: Id;
  createdBy?: UserSlim;
  createdAt: Date;
  updatedBy?: UserSlim;
  updatedAt: Date;
  status: TWUProposalStatus;
  history?: TWUProposalHistoryRecord[];
  submittedAt?: Date;
  opportunity: TWUOpportunitySlim;
  organization?: OrganizationSlim;
  attachments?: FileRecord[];
  resourceQuestionResponses: TWUProposalResourceQuestionResponse[];
  questionsScore?: number;
  challengeScore?: number;
  priceScore?: number;
  totalScore?: number;
  proposedCost: number;
  rank?: number;
  anonymousProponentName: string;
}

export interface TWUProposalResourceQuestionResponse {
  response: string;
  order: number;
  score?: number; // Admin/owner only
}

export interface TWUProposalHistoryRecord {
  createdAt: Date;
  createdBy: UserSlim | null;
  type: ADT<"status", TWUProposalStatus> | ADT<"event", TWUProposalEvent>;
  note: string;
}

export type TWUProposalSlim = Omit<
  TWUProposal,
  "history" | "attachments" | "resourceQuestionResponses"
>;

// Create.

export type CreateTWUProposalStatus =
  | TWUProposalStatus.Draft
  | TWUProposalStatus.Submitted;

export type CreateTWUProposalResourceQuestionResponseBody =
  TWUProposalResourceQuestionResponse;

export interface CreateRequestBody {
  opportunity: Id;
  organization?: Id;
  attachments: Id[];
  resourceQuestionResponses: CreateTWUProposalResourceQuestionResponseBody[];
  status: CreateTWUProposalStatus;
  proposedCost: number;
}

export interface CreateTWUProposalResourceQuestionResponseValidationErrors
  extends ErrorTypeFrom<CreateTWUProposalResourceQuestionResponseBody> {
  parseFailure?: string[];
}

export interface CreateValidationErrors extends BodyWithErrors {
  attachments?: string[][];
  resourceQuestionResponses?: CreateTWUProposalResourceQuestionResponseValidationErrors[];
  organization?: string[];
  opportunity?: string[];
  status?: string[];
  totalProposedCost?: string[];
}

// Update.

export interface UpdateResourceQuestionScoreBody {
  order: number;
  score: number;
}

export type UpdateRequestBody =
  | ADT<"edit", UpdateEditRequestBody>
  | ADT<"submit", string>
  | ADT<"scoreQuestions", UpdateResourceQuestionScoreBody[]>
  | ADT<"screenInToChallenge", string>
  | ADT<"screenOutFromChallenge", string>
  | ADT<"scoreChallenge", number>
  | ADT<"award", string>
  | ADT<"disqualify", string>
  | ADT<"withdraw", string>;

export type UpdateEditRequestBody = Omit<
  CreateRequestBody,
  "opportunity" | "status"
>;

type UpdateADTErrors =
  | ADT<"edit", UpdateEditValidationErrors>
  | ADT<"submit", string[]>
  | ADT<"scoreQuestions", UpdateResourceQuestionScoreValidationErrors[]>
  | ADT<"screenInToChallenge", string[]>
  | ADT<"screenOutFromChallenge", string[]>
  | ADT<"scoreChallenge", string[]>
  | ADT<"award", string[]>
  | ADT<"disqualify", string[]>
  | ADT<"withdraw", string[]>
  | ADT<"parseFailure">;

export interface UpdateResourceQuestionScoreValidationErrors {
  order?: string[];
  score?: string[];
  parseFailure?: string[];
}

export interface UpdateEditValidationErrors {
  attachments?: string[][];
  organization?: string[];
}

export interface UpdateValidationErrors extends BodyWithErrors {
  proposal?: UpdateADTErrors;
}

// Delete.

export interface DeleteValidationErrors extends BodyWithErrors {
  status?: string[];
}

export function isTWUProposalStatusVisibleToGovernment(
  s: TWUProposalStatus,
  role: UserType.Government | UserType.Admin
): boolean {
  switch (s) {
    case TWUProposalStatus.Draft:
    case TWUProposalStatus.Submitted:
      return false;
    case TWUProposalStatus.Withdrawn:
      return role === UserType.Admin;
    default:
      return true;
  }
}

export const rankableTWUProposalStatuses: readonly TWUProposalStatus[] = [
  TWUProposalStatus.Awarded,
  TWUProposalStatus.NotAwarded
];

export function isValidStatusChange(
  from: TWUProposalStatus,
  to: TWUProposalStatus,
  userType: UserType,
  proposalDeadline: Date
): boolean {
  const hasProposalDeadlinePassed = isDateInThePast(proposalDeadline);
  switch (from) {
    case TWUProposalStatus.Draft:
      return (
        to === TWUProposalStatus.Submitted &&
        userType === UserType.Vendor &&
        !hasProposalDeadlinePassed
      );

    case TWUProposalStatus.Submitted:
      return (
        (to === TWUProposalStatus.Withdrawn && userType === UserType.Vendor) ||
        (to === TWUProposalStatus.UnderReviewResourceQuestions &&
          userType !== UserType.Vendor &&
          hasProposalDeadlinePassed)
      );

    case TWUProposalStatus.UnderReviewResourceQuestions:
      return (
        (([
          TWUProposalStatus.EvaluatedResourceQuestions,
          TWUProposalStatus.Disqualified
        ].includes(to) &&
          userType !== UserType.Vendor) ||
          (to === TWUProposalStatus.Withdrawn &&
            userType === UserType.Vendor)) &&
        hasProposalDeadlinePassed
      );

    case TWUProposalStatus.EvaluatedResourceQuestions:
      return (
        ([
          TWUProposalStatus.UnderReviewChallenge,
          TWUProposalStatus.Disqualified
        ].includes(to) &&
          userType !== UserType.Vendor) ||
        (to === TWUProposalStatus.Withdrawn && userType === UserType.Vendor)
      );

    case TWUProposalStatus.UnderReviewChallenge:
      return (
        ([
          TWUProposalStatus.EvaluatedChallenge,
          TWUProposalStatus.Disqualified,
          TWUProposalStatus.EvaluatedResourceQuestions
        ].includes(to) &&
          userType !== UserType.Vendor) ||
        (to === TWUProposalStatus.Withdrawn && userType === UserType.Vendor)
      );

    case TWUProposalStatus.EvaluatedChallenge:
      return (
        ([TWUProposalStatus.Disqualified].includes(to) &&
          userType !== UserType.Vendor) ||
        (to === TWUProposalStatus.Withdrawn && userType === UserType.Vendor)
      );

    case TWUProposalStatus.Awarded:
      return (
        ((to === TWUProposalStatus.Disqualified &&
          userType !== UserType.Vendor) ||
          (to === TWUProposalStatus.Withdrawn &&
            userType === UserType.Vendor)) &&
        hasProposalDeadlinePassed
      );

    case TWUProposalStatus.NotAwarded:
      return (
        [TWUProposalStatus.Awarded, TWUProposalStatus.Disqualified].includes(
          to
        ) &&
        userType !== UserType.Vendor &&
        hasProposalDeadlinePassed
      );

    case TWUProposalStatus.Withdrawn:
      return (
        userType === UserType.Vendor &&
        !hasProposalDeadlinePassed &&
        to === TWUProposalStatus.Submitted
      );
    default:
      return false;
  }
}

// Return score out of 100 calculated from total points awarded to all questions / max possible
export function calculateProposalResourceQuestionScore(
  resourceQuestionResponses: TWUProposalResourceQuestionResponse[],
  resourceQuestions: TWUResourceQuestion[]
): number {
  const maxPossibleScore = resourceQuestions.reduce(
    (acc, v) => acc + v.score,
    0
  );
  const actualScore = resourceQuestionResponses.reduce(
    (acc, v) => acc + (v.score || 0),
    0
  );
  return (actualScore / maxPossibleScore) * 100;
}

// Calculate total score for proposal based on scores for each stage and contributing weight defined on opportunity
export function calculateTotalProposalScore(
  proposal: TWUProposal,
  opportunity: TWUOpportunity
): number {
  const resourceQuestionsScore = calculateProposalResourceQuestionScore(
    proposal.resourceQuestionResponses,
    opportunity.resourceQuestions
  );
  return (
    (resourceQuestionsScore * opportunity.questionsWeight) / 100 +
    ((proposal.challengeScore || 0) * opportunity.challengeWeight) / 100 +
    ((proposal.priceScore || 0) * opportunity.priceWeight) / 100
  );
}

export function showScoreAndRankToProponent(proposal: TWUProposal): boolean {
  return (
    proposal.totalScore !== undefined &&
    proposal.rank !== undefined &&
    (proposal.status === TWUProposalStatus.Awarded ||
      proposal.status === TWUProposalStatus.NotAwarded)
  );
}

export function canTWUProposalBeScreenedToFromChallenge(
  p: Pick<TWUProposal, "status">
): boolean {
  switch (p.status) {
    case TWUProposalStatus.EvaluatedResourceQuestions:
    case TWUProposalStatus.UnderReviewChallenge:
      return true;
    default:
      return false;
  }
}

export function canTWUProposalBeAwarded(
  p: Pick<TWUProposal, "status">
): boolean {
  switch (p.status) {
    case TWUProposalStatus.NotAwarded:
      return true;
    default:
      return false;
  }
}

export function isTWUProposalInResourceQuestions(
  p: Pick<TWUProposal, "status" | "questionsScore">
): boolean {
  switch (p.status) {
    case TWUProposalStatus.UnderReviewResourceQuestions:
    case TWUProposalStatus.EvaluatedResourceQuestions:
    case TWUProposalStatus.UnderReviewChallenge:
    case TWUProposalStatus.EvaluatedChallenge:
    case TWUProposalStatus.Awarded:
      return true;
    default:
      return p.questionsScore !== undefined;
  }
}

export function isTWUProposalInChallenge(
  p: Pick<TWUProposal, "status" | "challengeScore">
): boolean {
  switch (p.status) {
    case TWUProposalStatus.UnderReviewChallenge:
    case TWUProposalStatus.EvaluatedChallenge:
    case TWUProposalStatus.Awarded:
      return true;
    default:
      return p.challengeScore !== undefined;
  }
}

export function getTWUProponentName(
  p: Pick<TWUProposal, "organization" | "anonymousProponentName">
): string {
  return p.organization?.legalName || p.anonymousProponentName || "Proponent";
}
