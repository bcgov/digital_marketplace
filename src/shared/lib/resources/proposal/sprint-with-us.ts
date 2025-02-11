import { compareNumbers, compareStrings, isDateInThePast } from "shared/lib";
import { FileRecord } from "shared/lib/resources/file";
import {
  SWUOpportunity,
  SWUOpportunitySlim,
  SWUTeamQuestion
} from "shared/lib/resources/opportunity/sprint-with-us";
import { OrganizationSlim } from "shared/lib/resources/organization";
import { UserSlim, UserType } from "shared/lib/resources/user";
import { ADT, BodyWithErrors, Comparison, Id } from "shared/lib/types";
import { ErrorTypeFrom } from "shared/lib/validation";

export const DEFAULT_SWU_PROPOSAL_TITLE = "Unknown";
export const NUM_SCORE_DECIMALS = 2;

export enum SWUProposalPhaseType {
  Inception = "INCEPTION",
  Prototype = "PROTOTYPE",
  Implementation = "IMPLEMENTATION"
}

export function parseSWUProposalPhaseType(
  raw: string
): SWUProposalPhaseType | null {
  switch (raw) {
    case SWUProposalPhaseType.Inception:
      return SWUProposalPhaseType.Inception;
    case SWUProposalPhaseType.Prototype:
      return SWUProposalPhaseType.Prototype;
    case SWUProposalPhaseType.Implementation:
      return SWUProposalPhaseType.Implementation;
    default:
      return null;
  }
}

export function swuProposalPhaseTypeToTitleCase(
  phase: SWUProposalPhaseType
): string {
  switch (phase) {
    case SWUProposalPhaseType.Inception:
      return "Inception";
    case SWUProposalPhaseType.Prototype:
      return "Proof of Concept";
    case SWUProposalPhaseType.Implementation:
      return "Implementation";
  }
}

export enum SWUProposalStatus {
  Draft = "DRAFT",
  Submitted = "SUBMITTED",
  EvaluationTeamQuestionsIndividual = "EVALUATION_QUESTIONS_INDIVIDUAL",
  EvaluationTeamQuestionsConsensus = "EVALUATION_QUESTIONS_CONSENSUS",
  UnderReviewTeamQuestions = "UNDER_REVIEW_QUESTIONS", // TODO: Remove
  EvaluatedTeamQuestions = "EVALUATED_QUESTIONS", // TODO: Remove
  UnderReviewCodeChallenge = "UNDER_REVIEW_CODE_CHALLENGE",
  EvaluatedCodeChallenge = "EVALUATED_CODE_CHALLENGE",
  UnderReviewTeamScenario = "UNDER_REVIEW_TEAM_SCENARIO",
  EvaluatedTeamScenario = "EVALUATED_TEAM_SCENARIO",
  Awarded = "AWARDED",
  NotAwarded = "NOT_AWARDED",
  Disqualified = "DISQUALIFIED",
  Withdrawn = "WITHDRAWN"
}

export enum SWUProposalEvent {
  QuestionsScoreEntered = "QUESTIONS_SCORE_ENTERED",
  ChallengeScoreEntered = "CHALLENGE_SCORE_ENTERED",
  ScenarioScoreEntered = "SCENARIO_SCORE_ENTERED",
  PriceScoreEntered = "PRICE_SCORE_ENTERED"
}

export function parseSWUProposalStatus(raw: string): SWUProposalStatus | null {
  switch (raw) {
    case SWUProposalStatus.Draft:
      return SWUProposalStatus.Draft;
    case SWUProposalStatus.Submitted:
      return SWUProposalStatus.Submitted;
    case SWUProposalStatus.UnderReviewTeamQuestions:
      return SWUProposalStatus.UnderReviewTeamQuestions;
    case SWUProposalStatus.EvaluatedTeamQuestions:
      return SWUProposalStatus.EvaluatedTeamQuestions;
    case SWUProposalStatus.UnderReviewCodeChallenge:
      return SWUProposalStatus.UnderReviewCodeChallenge;
    case SWUProposalStatus.EvaluatedCodeChallenge:
      return SWUProposalStatus.EvaluatedCodeChallenge;
    case SWUProposalStatus.UnderReviewTeamScenario:
      return SWUProposalStatus.UnderReviewTeamScenario;
    case SWUProposalStatus.EvaluatedTeamScenario:
      return SWUProposalStatus.EvaluatedTeamScenario;
    case SWUProposalStatus.Awarded:
      return SWUProposalStatus.Awarded;
    case SWUProposalStatus.NotAwarded:
      return SWUProposalStatus.NotAwarded;
    case SWUProposalStatus.Disqualified:
      return SWUProposalStatus.Disqualified;
    case SWUProposalStatus.Withdrawn:
      return SWUProposalStatus.Withdrawn;
    default:
      return null;
  }
}

function quantifySWUProposalStatusForSort(a: SWUProposalStatus): number {
  // 0 = first
  switch (a) {
    case SWUProposalStatus.Awarded:
      return 0;
    case SWUProposalStatus.NotAwarded:
      return 1;
    case SWUProposalStatus.EvaluationTeamQuestionsIndividual:
    case SWUProposalStatus.EvaluationTeamQuestionsConsensus:
    case SWUProposalStatus.UnderReviewTeamQuestions:
    case SWUProposalStatus.EvaluatedTeamQuestions:
    case SWUProposalStatus.UnderReviewCodeChallenge:
    case SWUProposalStatus.EvaluatedCodeChallenge:
    case SWUProposalStatus.UnderReviewTeamScenario:
    case SWUProposalStatus.EvaluatedTeamScenario:
      return 2;
    case SWUProposalStatus.Withdrawn:
      return 3;
    case SWUProposalStatus.Disqualified:
      return 4;
    case SWUProposalStatus.Draft:
    case SWUProposalStatus.Submitted:
      return 5;
  }
}

function getSWUProposalAnonymousProponentNumber(proposal: SWUProposalSlim) {
  return Number(proposal.anonymousProponentName.match(/\d+/)?.at(0));
}

export function compareSWUProposalAnonymousProponentNumber(
  a: SWUProposalSlim,
  b: SWUProposalSlim
) {
  return compareNumbers(
    getSWUProposalAnonymousProponentNumber(a),
    getSWUProposalAnonymousProponentNumber(b)
  );
}

export function compareSWUProposalStatuses(
  a: SWUProposalStatus,
  b: SWUProposalStatus
): Comparison {
  return compareNumbers(
    quantifySWUProposalStatusForSort(a),
    quantifySWUProposalStatusForSort(b)
  );
}

type SWUProposalScore =
  | "totalScore"
  | "questionsScore"
  | "challengeScore"
  | "scenarioScore";

export function compareSWUProposalsForPublicSector(
  a: SWUProposalSlim,
  b: SWUProposalSlim,
  byScore: SWUProposalScore
): Comparison {
  const statusComparison = compareSWUProposalStatuses(a.status, b.status);
  if (statusComparison !== 0) {
    return statusComparison;
  }
  // Compare by score.
  // Give precedence to scored proposals.
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
  return compareStrings(getSWUProponentName(a), getSWUProponentName(b));
}

export interface SWUProposal {
  id: Id;
  createdBy?: UserSlim;
  createdAt: Date;
  updatedBy?: UserSlim;
  updatedAt: Date;
  status: SWUProposalStatus;
  history?: SWUProposalHistoryRecord[];
  submittedAt?: Date;
  opportunity: SWUOpportunitySlim;
  organization?: OrganizationSlim;
  inceptionPhase?: SWUProposalPhase;
  prototypePhase?: SWUProposalPhase;
  implementationPhase?: SWUProposalPhase;
  references?: SWUProposalReference[];
  attachments?: FileRecord[];
  teamQuestionResponses: SWUProposalTeamQuestionResponse[];
  questionsScore?: number;
  challengeScore?: number;
  scenarioScore?: number;
  priceScore?: number;
  totalScore?: number;
  rank?: number;
  anonymousProponentName: string;
}

export interface SWUProposalPhase {
  phase: SWUProposalPhaseType;
  members: SWUProposalTeamMember[];
  proposedCost: number;
}

export interface SWUProposalTeamMember {
  member: UserSlim;
  scrumMaster: boolean;
  pending: boolean;
  capabilities: string[];
  idpUsername: string;
}

export interface SWUProposalReference {
  name: string;
  company: string;
  phone: string;
  email: string;
  order: number;
}

export interface SWUProposalTeamQuestionResponse {
  response: string;
  order: number;
  score?: number; // Admin/owner only
}

export interface SWUProposalHistoryRecord {
  createdAt: Date;
  createdBy: UserSlim | null;
  type: ADT<"status", SWUProposalStatus> | ADT<"event", SWUProposalEvent>;
  note: string;
}

export type SWUProposalSlim = Omit<
  SWUProposal,
  | "history"
  | "attachments"
  | "references"
  | "teamQuestionResponses"
  | "inceptionPhase"
  | "prototypePhase"
  | "implementationPhase"
>;

// Create.

export type CreateSWUProposalStatus =
  | SWUProposalStatus.Draft
  | SWUProposalStatus.Submitted;

export interface CreateSWUProposalTeamMemberBody {
  member: Id;
  scrumMaster: boolean;
}

export interface CreateSWUProposalPhaseBody {
  members: CreateSWUProposalTeamMemberBody[];
  proposedCost: number;
}

export type CreateSWUProposalReferenceBody = SWUProposalReference;

export type CreateSWUProposalTeamQuestionResponseBody =
  SWUProposalTeamQuestionResponse;

export interface CreateRequestBody {
  opportunity: Id;
  organization?: Id;
  inceptionPhase?: CreateSWUProposalPhaseBody;
  prototypePhase?: CreateSWUProposalPhaseBody;
  implementationPhase: CreateSWUProposalPhaseBody;
  references: CreateSWUProposalReferenceBody[];
  attachments: Id[];
  teamQuestionResponses: CreateSWUProposalTeamQuestionResponseBody[];
  status: CreateSWUProposalStatus;
}

export interface CreateSWUProposalPhaseValidationErrors {
  members?: CreateSWUProposalTeamMemberValidationErrors[];
  proposedCost?: string[];
  phase?: string[];
}

export interface CreateSWUProposalTeamMemberValidationErrors
  extends ErrorTypeFrom<CreateSWUProposalTeamMemberBody> {
  parseFailure?: string[];
  members?: string[];
}

export interface CreateSWUProposalReferenceValidationErrors
  extends ErrorTypeFrom<CreateSWUProposalReferenceBody> {
  parseFailure?: string[];
}

export interface CreateSWUProposalTeamQuestionResponseValidationErrors
  extends ErrorTypeFrom<CreateSWUProposalTeamQuestionResponseBody> {
  parseFailure?: string[];
}

export interface CreateValidationErrors extends BodyWithErrors {
  attachments?: string[][];
  inceptionPhase?: CreateSWUProposalPhaseValidationErrors;
  prototypePhase?: CreateSWUProposalPhaseValidationErrors;
  implementationPhase?: CreateSWUProposalPhaseValidationErrors;
  references?: CreateSWUProposalReferenceValidationErrors[];
  teamQuestionResponses?: CreateSWUProposalTeamQuestionResponseValidationErrors[];
  organization?: string[];
  existingOrganizationProposal?: { proposalId: Id; errors: string[] };
  opportunity?: string[];
  status?: string[];
  totalProposedCost?: string[];
  team?: string[];
}

// Update.

export interface UpdateTeamQuestionScoreBody {
  order: number;
  score: number;
}

export type UpdateRequestBody =
  | ADT<"edit", UpdateEditRequestBody>
  | ADT<"submit", string>
  | ADT<"scoreQuestions", UpdateTeamQuestionScoreBody[]>
  | ADT<"screenInToCodeChallenge", string>
  | ADT<"screenOutFromCodeChallenge", string>
  | ADT<"scoreCodeChallenge", number>
  | ADT<"screenInToTeamScenario", string>
  | ADT<"screenOutFromTeamScenario", string>
  | ADT<"scoreTeamScenario", number>
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
  | ADT<"scoreQuestions", UpdateTeamQuestionScoreValidationErrors[]>
  | ADT<"screenInToCodeChallenge", string[]>
  | ADT<"screenOutFromCodeChallenge", string[]>
  | ADT<"scoreCodeChallenge", string[]>
  | ADT<"screenInToTeamScenario", string[]>
  | ADT<"screenOutFromTeamScenario", string[]>
  | ADT<"scoreTeamScenario", string[]>
  | ADT<"award", string[]>
  | ADT<"disqualify", string[]>
  | ADT<"withdraw", string[]>
  | ADT<"parseFailure">;

export interface UpdateTeamQuestionScoreValidationErrors {
  order?: string[];
  score?: string[];
  parseFailure?: string[];
}

export interface UpdateEditValidationErrors {
  attachments?: string[][];
  inceptionPhase?: CreateSWUProposalPhaseValidationErrors;
  prototypePhase?: CreateSWUProposalPhaseValidationErrors;
  implementationPhase?: CreateSWUProposalPhaseValidationErrors;
  references?: CreateSWUProposalReferenceValidationErrors[];
  organization?: string[];
  existingOrganizationProposal?: { proposalId: Id; errors: string[] };
}

export interface UpdateValidationErrors extends BodyWithErrors {
  proposal?: UpdateADTErrors;
}

// Delete.

export interface DeleteValidationErrors extends BodyWithErrors {
  status?: string[];
}

export function isSWUProposalStatusVisibleToGovernment(
  s: SWUProposalStatus,
  role: UserType.Government | UserType.Admin
): boolean {
  switch (s) {
    case SWUProposalStatus.Draft:
    case SWUProposalStatus.Submitted:
      return false;
    case SWUProposalStatus.Withdrawn:
      return role === UserType.Admin;
    default:
      return true;
  }
}

export const rankableSWUProposalStatuses: readonly SWUProposalStatus[] = [
  SWUProposalStatus.EvaluatedTeamScenario,
  SWUProposalStatus.Awarded,
  SWUProposalStatus.NotAwarded
];

export function isValidStatusChange(
  from: SWUProposalStatus,
  to: SWUProposalStatus,
  userType: UserType,
  proposalDeadline: Date
): boolean {
  const hasProposalDeadlinePassed = isDateInThePast(proposalDeadline);
  switch (from) {
    case SWUProposalStatus.Draft:
      return (
        to === SWUProposalStatus.Submitted &&
        userType === UserType.Vendor &&
        !hasProposalDeadlinePassed
      );

    case SWUProposalStatus.Submitted:
      return (
        (to === SWUProposalStatus.Withdrawn && userType === UserType.Vendor) ||
        (to === SWUProposalStatus.UnderReviewTeamQuestions &&
          userType !== UserType.Vendor &&
          hasProposalDeadlinePassed)
      );

    case SWUProposalStatus.UnderReviewTeamQuestions:
      return (
        [
          SWUProposalStatus.EvaluatedTeamQuestions,
          SWUProposalStatus.Disqualified
        ].includes(to) &&
        userType !== UserType.Vendor &&
        hasProposalDeadlinePassed
      );

    case SWUProposalStatus.EvaluatedTeamQuestions:
      return (
        [
          SWUProposalStatus.UnderReviewCodeChallenge,
          SWUProposalStatus.Disqualified
        ].includes(to) && userType !== UserType.Vendor
      );

    case SWUProposalStatus.UnderReviewCodeChallenge:
      return (
        [
          SWUProposalStatus.EvaluatedCodeChallenge,
          SWUProposalStatus.Disqualified,
          SWUProposalStatus.EvaluatedTeamQuestions
        ].includes(to) && userType !== UserType.Vendor
      );

    case SWUProposalStatus.EvaluatedCodeChallenge:
      return (
        [
          SWUProposalStatus.UnderReviewTeamScenario,
          SWUProposalStatus.Disqualified
        ].includes(to) && userType !== UserType.Vendor
      );

    case SWUProposalStatus.UnderReviewTeamScenario:
      return (
        [
          SWUProposalStatus.EvaluatedTeamScenario,
          SWUProposalStatus.Disqualified,
          SWUProposalStatus.EvaluatedCodeChallenge
        ].includes(to) && userType !== UserType.Vendor
      );

    case SWUProposalStatus.EvaluatedTeamScenario:
      return (
        [
          SWUProposalStatus.Awarded,
          SWUProposalStatus.NotAwarded,
          SWUProposalStatus.Disqualified
        ].includes(to) &&
        userType !== UserType.Vendor &&
        hasProposalDeadlinePassed
      );

    case SWUProposalStatus.Awarded:
      return (
        to === SWUProposalStatus.Disqualified &&
        userType !== UserType.Vendor &&
        hasProposalDeadlinePassed
      );

    case SWUProposalStatus.NotAwarded:
      return (
        [SWUProposalStatus.Awarded, SWUProposalStatus.Disqualified].includes(
          to
        ) &&
        userType !== UserType.Vendor &&
        hasProposalDeadlinePassed
      );

    case SWUProposalStatus.Withdrawn:
      return (
        userType === UserType.Vendor &&
        !hasProposalDeadlinePassed &&
        to === SWUProposalStatus.Submitted
      );
    default:
      return false;
  }
}

// Return score out of 100 calculated from total points awarded to all questions / max possible
export function calculateProposalTeamQuestionScore(
  teamQuestionResponses: SWUProposalTeamQuestionResponse[],
  teamQuestions: SWUTeamQuestion[]
): number {
  const maxPossibleScore = teamQuestions.reduce((acc, v) => acc + v.score, 0);
  const actualScore = teamQuestionResponses.reduce(
    (acc, v) => acc + (v.score || 0),
    0
  );
  return (actualScore / maxPossibleScore) * 100;
}

// Calculate total score for proposal based on scores for each stage and contributing weight defined on opportunity
export function calculateTotalProposalScore(
  proposal: SWUProposal,
  opportunity: SWUOpportunity
): number {
  const teamQuestionsScore = calculateProposalTeamQuestionScore(
    proposal.teamQuestionResponses,
    opportunity.teamQuestions
  );
  return (
    (teamQuestionsScore * opportunity.questionsWeight) / 100 +
    ((proposal.challengeScore || 0) * opportunity.codeChallengeWeight) / 100 +
    ((proposal.scenarioScore || 0) * opportunity.scenarioWeight) / 100 +
    ((proposal.priceScore || 0) * opportunity.priceWeight) / 100
  );
}

type SWUProposalTeamMembersAcc = [Set<string>, SWUProposalTeamMember[]];

export function swuProposalTeamMembers(
  proposal: SWUProposal,
  sort = false
): SWUProposalTeamMember[] {
  const compute = (members: SWUProposalTeamMember[]) =>
    members.reduce(
      (acc, m) => {
        const [set, members] = acc;
        if (set.has(m.member.id)) {
          return acc;
        } else {
          return [
            set.add(m.member.id),
            [...members, m]
          ] as SWUProposalTeamMembersAcc;
        }
      },
      [new Set(), []] as SWUProposalTeamMembersAcc
    );
  const members = compute([
    ...(proposal.inceptionPhase?.members || []),
    ...(proposal.prototypePhase?.members || []),
    ...(proposal.implementationPhase?.members || [])
  ])[1];
  if (sort) {
    return members.sort((a, b) => compareStrings(a.member.name, b.member.name));
  } else {
    return members;
  }
}

export function swuProposalNumTeamMembers(proposal: SWUProposal): number {
  return swuProposalTeamMembers(proposal).length;
}

export function swuProposalTotalProposedCost(proposal: SWUProposal): number {
  const sum = (ns: number[]) => ns.reduce((acc, n) => acc + n, 0);
  return sum([
    proposal.inceptionPhase?.proposedCost || 0,
    proposal.prototypePhase?.proposedCost || 0,
    proposal.implementationPhase?.proposedCost || 0
  ]);
}

/**
 * Returns true if the proposal has a score and a rank, and is either awarded or
 * not awarded. Used to determine if a scoreSheet should be presented to the user.
 *
 * @remarks
 * proposal.totalScore is only undefined when all available scores are empty;
 * when all of (TQ, CC, TS, P) have not been entered. proposal.totalScore can be
 * still be defined if some, but not all scores are entered.
 *
 * @see const includeTotalScore in {@link calculateScores} 'src/back-end/lib/db/proposal/sprint-with-us.ts'
 *
 * @param proposal SWUProposal
 * @returns boolean
 */
export function showScoreAndRankToProponent(proposal: SWUProposal): boolean {
  return (
    proposal.totalScore !== undefined &&
    proposal.rank !== undefined &&
    (proposal.status === SWUProposalStatus.Awarded ||
      proposal.status === SWUProposalStatus.NotAwarded)
  );
}

export function canSWUProposalBeScreenedToFromCodeChallenge(
  p: Pick<SWUProposal, "status">
): boolean {
  switch (p.status) {
    case SWUProposalStatus.EvaluatedTeamQuestions:
    case SWUProposalStatus.UnderReviewCodeChallenge:
      return true;
    default:
      return false;
  }
}

export function canSWUProposalBeScreenedToFromTeamScenario(
  p: Pick<SWUProposal, "status">
): boolean {
  switch (p.status) {
    case SWUProposalStatus.EvaluatedCodeChallenge:
    case SWUProposalStatus.UnderReviewTeamScenario:
      return true;
    default:
      return false;
  }
}

export function canSWUProposalBeAwarded(
  p: Pick<SWUProposal, "status">
): boolean {
  switch (p.status) {
    case SWUProposalStatus.NotAwarded:
    case SWUProposalStatus.EvaluatedTeamScenario:
      return true;
    default:
      return false;
  }
}

export function isSWUProposalInTeamQuestions(
  p: Pick<SWUProposal, "status" | "questionsScore">
): boolean {
  switch (p.status) {
    case SWUProposalStatus.UnderReviewTeamQuestions:
    case SWUProposalStatus.EvaluatedTeamQuestions:
    case SWUProposalStatus.UnderReviewCodeChallenge:
    case SWUProposalStatus.EvaluatedCodeChallenge:
    case SWUProposalStatus.UnderReviewTeamScenario:
    case SWUProposalStatus.EvaluatedTeamScenario:
    case SWUProposalStatus.Awarded:
      return true;
    default:
      return p.questionsScore !== undefined;
  }
}

export function isSWUProposalInCodeChallenge(
  p: Pick<SWUProposal, "status" | "challengeScore">
): boolean {
  switch (p.status) {
    case SWUProposalStatus.UnderReviewCodeChallenge:
    case SWUProposalStatus.EvaluatedCodeChallenge:
    case SWUProposalStatus.UnderReviewTeamScenario:
    case SWUProposalStatus.EvaluatedTeamScenario:
    case SWUProposalStatus.Awarded:
      return true;
    default:
      return p.challengeScore !== undefined;
  }
}

export function isSWUProposalInTeamScenario(
  p: Pick<SWUProposal, "status" | "scenarioScore">
): boolean {
  switch (p.status) {
    case SWUProposalStatus.UnderReviewTeamScenario:
    case SWUProposalStatus.EvaluatedTeamScenario:
    case SWUProposalStatus.Awarded:
      return true;
    default:
      return p.scenarioScore !== undefined;
  }
}

export function getSWUProponentName(
  p: Pick<SWUProposal, "organization" | "anonymousProponentName">
): string {
  return p.organization?.legalName || p.anonymousProponentName || "Proponent";
}
