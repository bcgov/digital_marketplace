import { isDateInTheFuture, isDateInThePast } from "shared/lib";
import { Addendum } from "shared/lib/resources/addendum";
import { FileRecord } from "shared/lib/resources/file";
import { User, UserSlim } from "shared/lib/resources/user";
import { ADT, BodyWithErrors, Id } from "shared/lib/types";
import { ErrorTypeFrom } from "shared/lib/validation";

export type { Addendum } from "shared/lib/resources/addendum";

export const DEFAULT_OPPORTUNITY_TITLE = "Untitled";
export const DEFAULT_QUESTIONS_WEIGHT = 25;
export const DEFAULT_CODE_CHALLENGE_WEIGHT = 65;
export const DEFAULT_PRICE_WEIGHT = 10;
export const MAX_RESOURCE_QUESTIONS = 100;
export const MAX_RESOURCE_QUESTION_WORD_LIMIT = 3000;
export const DEFAULT_RESOURCE_QUESTION_RESPONSE_WORD_LIMIT = 300;
export const DEFAULT_RESOURCE_QUESTION_AVAILABLE_SCORE = 5;

export enum TWUOpportunityStatus {
  Draft = "DRAFT",
  UnderReview = "UNDER_REVIEW",
  Published = "PUBLISHED",
  EvaluationResourceQuestionsIndividual = "EVAL_QUESTIONS_INDIVIDUAL",
  EvaluationResourceQuestionsConsensus = "EVAL_QUESTIONS_CONSENSUS",
  EvaluationChallenge = "EVAL_C",
  Processing = "PROCESSING",
  Awarded = "AWARDED",
  DeprecatedSuspended = "SUSPENDED",
  Canceled = "CANCELED"
}

export enum TWUOpportunityEvent {
  Edited = "EDITED",
  AddendumAdded = "ADDENDUM_ADDED",
  NoteAdded = "NOTE_ADDED"
}

export enum TWUServiceArea {
  FullStackDeveloper = "FULL_STACK_DEVELOPER",
  DataProfessional = "DATA_PROFESSIONAL",
  AgileCoach = "AGILE_COACH",
  DevopsSpecialist = "DEVOPS_SPECIALIST",
  ServiceDesigner = "SERVICE_DESIGNER"
}

export interface TWUOpportunityHistoryRecord {
  id: Id;
  createdAt: Date;
  createdBy: UserSlim | null;
  type: ADT<"status", TWUOpportunityStatus> | ADT<"event", TWUOpportunityEvent>;
  note: string;
}

/**
 * Type guard to narrow raw input to a TWUOpportunityStatus.
 *
 * @see {@link https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates}
 *
 * @param raw - a string value
 * @returns boolean
 */
function isTWUOpportunityStatus(
  raw: string | TWUOpportunityStatus
): raw is TWUOpportunityStatus {
  return Object.values(TWUOpportunityStatus).includes(
    raw as TWUOpportunityStatus
  );
}

/**
 * Determines if a raw string is part of the enum TWUOpportunityStatus and returns
 * the passed value or null.
 *
 * @see {@link TWUOpportunityStatus}
 *
 * @param raw - a string value
 * @returns TWUOpportunityStatus | null
 */
export function parseTWUOpportunityStatus(
  raw: string
): TWUOpportunityStatus | null {
  return isTWUOpportunityStatus(raw) ? raw : null;
}

/**
 * Type guard to narrow raw input to a TWUServiceArea.
 *
 * @see {@link https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates}
 *
 * @param raw - a string value
 * @returns boolean
 */
export function isTWUServiceArea(
  raw: string | TWUServiceArea
): raw is TWUServiceArea {
  return Object.values(TWUServiceArea).includes(raw as TWUServiceArea);
}

/**
 * Determines if a raw string is part of the enum TWUServiceArea and returns
 * the passed value or null.
 *
 * @see {@link TWUServiceArea}
 *
 * @param raw - a string value
 * @returns TWUServiceArea | null
 */
export function parseTWUServiceArea(raw: string): TWUServiceArea | null {
  return isTWUServiceArea(raw) ? raw : null;
}

export function isTWUOpportunityStatusInEvaluation(
  s: TWUOpportunityStatus
): boolean {
  switch (s) {
    case TWUOpportunityStatus.EvaluationResourceQuestionsIndividual:
    case TWUOpportunityStatus.EvaluationChallenge:
      return true;
    default:
      return false;
  }
}

export const publicOpportunityStatuses: readonly TWUOpportunityStatus[] = [
  TWUOpportunityStatus.Published,
  TWUOpportunityStatus.EvaluationResourceQuestionsIndividual,
  TWUOpportunityStatus.EvaluationResourceQuestionsConsensus,
  TWUOpportunityStatus.EvaluationChallenge,
  TWUOpportunityStatus.Processing,
  TWUOpportunityStatus.Awarded,
  TWUOpportunityStatus.Canceled
];

export const privateOpportunityStatuses: readonly TWUOpportunityStatus[] = [
  TWUOpportunityStatus.Draft,
  TWUOpportunityStatus.UnderReview
];

export function isTWUOpportunityAcceptingProposals(
  o: Pick<TWUOpportunity, "status" | "proposalDeadline">
): boolean {
  return (
    o.status === TWUOpportunityStatus.Published &&
    isDateInTheFuture(o.proposalDeadline)
  );
}

export function isUnpublished(o: Pick<TWUOpportunity, "status">): boolean {
  return (
    o.status === TWUOpportunityStatus.Draft ||
    o.status === TWUOpportunityStatus.UnderReview
  );
}

export function isOpen(
  o: Pick<TWUOpportunity, "status" | "proposalDeadline">
): boolean {
  return isTWUOpportunityAcceptingProposals(o);
}

export function isClosed(
  o: Pick<TWUOpportunity, "status" | "proposalDeadline">
): boolean {
  return !isOpen(o) && !isUnpublished(o);
}

export const editableOpportunityStatuses: readonly TWUOpportunityStatus[] = [
  TWUOpportunityStatus.Draft,
  TWUOpportunityStatus.UnderReview,
  TWUOpportunityStatus.Published
];

/**
 * @remarks
 */
export interface TWUOpportunity {
  id: Id;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: UserSlim;
  updatedBy?: UserSlim;
  successfulProponent?: TWUSuccessfulProponent;
  title: string;
  teaser: string;
  remoteOk: boolean;
  remoteDesc: string;
  location: string;
  resources: TWUResource[];
  description: string;
  proposalDeadline: Date;
  assignmentDate: Date;
  startDate: Date;
  completionDate: Date;
  maxBudget: number;
  questionsWeight: number;
  challengeWeight: number;
  priceWeight: number;
  status: TWUOpportunityStatus;
  attachments: FileRecord[];
  addenda: Addendum[];
  resourceQuestions: TWUResourceQuestion[];
  history?: TWUOpportunityHistoryRecord[];
  publishedAt?: Date;
  subscribed?: boolean;
  reporting?: {
    numProposals: number;
    numWatchers: number;
    numViews: number;
  };
  evaluationPanel?: TWUEvaluationPanelMember[];
}

export interface TWUSuccessfulProponent {
  id: Id; // Organization ID
  name: string; // Organization Legal Name
  email?: string; // Organization Contact Email
  totalScore?: number;
  createdBy?: UserSlim;
}

export interface TWUResourceQuestion {
  question: string;
  guideline: string;
  score: number;
  wordLimit: number;
  order: number;
  createdAt: Date;
  createdBy?: UserSlim;
  minimumScore?: number | null;
}

export interface TWUEvaluationPanelMember {
  user: UserSlim & { email: User["email"] };
  chair: boolean;
  evaluator: boolean;
  order: number;
}

export interface TWUResource {
  id: Id;
  serviceArea: TWUServiceArea;
  targetAllocation: number;
  mandatorySkills: string[];
  optionalSkills: string[];
  order: number;
}

export function getQuestionByOrder(
  opp: TWUOpportunity,
  order: number
): TWUResourceQuestion | null {
  for (const q of opp.resourceQuestions) {
    if (q.order === order) {
      return q;
    }
  }
  return null;
}

export type TWUOpportunitySlim = Pick<
  TWUOpportunity,
  | "id"
  | "title"
  | "teaser"
  | "createdAt"
  | "createdBy"
  | "updatedAt"
  | "updatedBy"
  | "status"
  | "proposalDeadline"
  | "maxBudget"
  | "location"
  | "remoteOk"
  | "subscribed"
>;

// Create.

export type CreateTWUOpportunityStatus =
  | TWUOpportunityStatus.Published
  | TWUOpportunityStatus.UnderReview
  | TWUOpportunityStatus.Draft;

export type CreateTWUResourceQuestionBody = Omit<
  TWUResourceQuestion,
  "createdAt" | "createdBy"
>;

/**
 * Resource's TWUServiceArea enum cannot be guaranteed until parsing is
 * complete.
 */
export type CreateTWUResourceBody = Omit<TWUResource, "serviceArea" | "id"> & {
  serviceArea: string;
};

/**
 * Resource Validated by the DB and serviceArea is a guaranteed to be a
 * serviceArea id.
 */
export type ValidatedCreateTWUResourceBody = Omit<
  CreateTWUResourceBody,
  "serviceArea"
> & {
  serviceArea: number;
};

export type CreateTWUEvaluationPanelMemberBody = {
  user: Id;
  chair: boolean;
  evaluator: boolean;
  order: number;
};

export interface CreateRequestBody {
  title: string;
  teaser: string;
  remoteOk: boolean;
  remoteDesc: string;
  location: string;
  proposalDeadline: string;
  assignmentDate: string;
  startDate: string;
  completionDate: string;
  maxBudget: number;
  resources: CreateTWUResourceBody[];
  description: string;
  questionsWeight: number;
  challengeWeight: number;
  priceWeight: number;
  attachments: Id[];
  status: CreateTWUOpportunityStatus;
  resourceQuestions: CreateTWUResourceQuestionBody[];
  evaluationPanel: CreateTWUEvaluationPanelMemberBody[];
}

export interface CreateTWUResourceQuestionValidationErrors
  extends ErrorTypeFrom<CreateTWUResourceQuestionBody> {
  parseFailure?: string[];
}

export interface CreateTWUResourceValidationErrors
  extends ErrorTypeFrom<CreateTWUResourceBody> {
  parseFailure?: string[];
}

export interface CreateTWUEvaluationPanelMemberValidationErrors
  extends ErrorTypeFrom<CreateTWUEvaluationPanelMemberBody> {
  parseFailure?: string[];
  members?: string[];
}

export interface CreateValidationErrors
  extends Omit<
    ErrorTypeFrom<CreateRequestBody> & BodyWithErrors,
    | "resources"
    | "mandatorySkills"
    | "optionalSkills"
    | "resourceQuestions"
    | "attachments"
    | "evaluationPanel"
  > {
  resources?: CreateTWUResourceValidationErrors[];
  mandatorySkills?: string[][];
  optionalSkills?: string[][];
  resourceQuestions?: CreateTWUResourceQuestionValidationErrors[];
  attachments?: string[][];
  scoreWeights?: string[];
  evaluationPanel?: CreateTWUEvaluationPanelMemberValidationErrors[];
}

// Update.

export type UpdateRequestBody =
  | ADT<"edit", UpdateEditRequestBody>
  | ADT<"submitForReview", string>
  | ADT<"publish", string>
  | ADT<"startChallenge", string>
  | ADT<"cancel", string>
  | ADT<"addAddendum", string>
  | ADT<
      "submitIndividualQuestionEvaluations",
      SubmitQuestionEvaluationsWithNoteRequestBody
    >
  | ADT<
      "submitConsensusQuestionEvaluations",
      SubmitQuestionEvaluationsWithNoteRequestBody
    >
  | ADT<"editEvaluationPanel", CreateTWUEvaluationPanelMemberBody[]>
  | ADT<"finalizeQuestionConsensuses", string>;

export type UpdateEditRequestBody = Omit<CreateRequestBody, "status">;

export interface UpdateWithNoteRequestBody {
  note: string;
  attachments: Id[];
}

export interface UpdateWithNoteValidationErrors
  extends Omit<ErrorTypeFrom<UpdateWithNoteRequestBody>, "attachments"> {
  attachments?: string[][];
}

export interface SubmitQuestionEvaluationsWithNoteRequestBody {
  note: string;
  proposals: Id[];
}

type UpdateADTErrors =
  | ADT<"edit", UpdateEditValidationErrors>
  | ADT<"submitForReview", string[]>
  | ADT<"publish", string[]>
  | ADT<"startChallenge", string[]>
  | ADT<"cancel", string[]>
  | ADT<"addAddendum", string[]>
  | ADT<"submitIndividualQuestionEvaluations", string[]>
  | ADT<"submitConsensusQuestionEvaluations", string[]>
  | ADT<"editEvaluationPanel", UpdateEditValidationErrors>
  | ADT<"finalizeQuestionConsensuses", string[]>
  | ADT<"parseFailure">;

export interface UpdateValidationErrors extends BodyWithErrors {
  opportunity?: UpdateADTErrors;
}

export interface UpdateEditValidationErrors
  extends Omit<
    ErrorTypeFrom<UpdateEditRequestBody>,
    | "resources"
    | "mandatorySkills"
    | "optionalSkills"
    | "resourceQuestions"
    | "attachments"
    | "evaluationPanel"
  > {
  resources?: CreateTWUResourceValidationErrors[];
  mandatorySkills?: string[][];
  optionalSkills?: string[][];
  resourceQuestions?: CreateTWUResourceQuestionValidationErrors[];
  attachments?: string[][];
  scoreWeights?: string[];
  evaluationPanel?: CreateTWUEvaluationPanelMemberValidationErrors[];
}

// Delete.

export interface DeleteValidationErrors extends BodyWithErrors {
  status?: string[];
}

export function isValidStatusChange(
  from: TWUOpportunityStatus,
  to: TWUOpportunityStatus
): boolean {
  switch (from) {
    case TWUOpportunityStatus.Draft:
      return [
        TWUOpportunityStatus.UnderReview,
        TWUOpportunityStatus.Published
      ].includes(to);
    case TWUOpportunityStatus.UnderReview:
      return [TWUOpportunityStatus.Published].includes(to);
    case TWUOpportunityStatus.Published:
      return [
        TWUOpportunityStatus.Canceled,
        TWUOpportunityStatus.EvaluationResourceQuestionsIndividual
      ].includes(to);
    case TWUOpportunityStatus.EvaluationResourceQuestionsIndividual:
      return [
        TWUOpportunityStatus.Canceled,
        TWUOpportunityStatus.EvaluationResourceQuestionsConsensus
      ].includes(to);
    case TWUOpportunityStatus.EvaluationResourceQuestionsConsensus:
      return [
        TWUOpportunityStatus.Canceled,
        TWUOpportunityStatus.EvaluationChallenge
      ].includes(to);
    case TWUOpportunityStatus.EvaluationChallenge:
      return [
        TWUOpportunityStatus.Canceled,
        TWUOpportunityStatus.Processing
      ].includes(to);
    case TWUOpportunityStatus.Processing:
      return [TWUOpportunityStatus.Canceled].includes(to);
    default:
      return false;
  }
}

export function canTWUOpportunityBeScreenedInToChallenge(
  o: TWUOpportunity
): boolean {
  switch (o.status) {
    case TWUOpportunityStatus.EvaluationResourceQuestionsIndividual:
      return true;
    default:
      return false;
  }
}

export function canTWUOpportunityBeAwarded(o: TWUOpportunity): boolean {
  switch (o.status) {
    case TWUOpportunityStatus.Processing:
    case TWUOpportunityStatus.Awarded:
      return true;
    default:
      return false;
  }
}

export function canViewTWUOpportunityProposals(o: TWUOpportunity): boolean {
  // Return true if the opportunity has ever had the `Evaluation` status.
  return (
    !!o.history &&
    o.history.reduce((acc, record) => {
      return (
        acc ||
        (record.type.tag === "status" &&
          isTWUOpportunityStatusInEvaluation(record.type.value))
      );
    }, false as boolean)
  );
}

export function canViewTWUOpportunityResourceQuestionResponseEvaluations(
  o: TWUOpportunity,
  status: TWUOpportunityStatus
): boolean {
  // Return true if the opportunity has ever had the status.
  return (
    !!o.history &&
    o.history.reduce((acc, record) => {
      return (
        acc || (record.type.tag === "status" && record.type.value === status)
      );
    }, false as boolean)
  );
}

export function canTWUOpportunityDetailsBeEdited(
  o: TWUOpportunity,
  adminsOnly: boolean
): boolean {
  switch (o.status) {
    case TWUOpportunityStatus.Draft:
    case TWUOpportunityStatus.UnderReview:
      return true;
    case TWUOpportunityStatus.Published:
      return adminsOnly;
    default:
      return false;
  }
}

export function isTWUOpportunityPublic(o: TWUOpportunity): boolean {
  switch (o.status) {
    case TWUOpportunityStatus.Published:
    case TWUOpportunityStatus.EvaluationResourceQuestionsIndividual:
    case TWUOpportunityStatus.EvaluationResourceQuestionsConsensus:
    case TWUOpportunityStatus.EvaluationChallenge:
    case TWUOpportunityStatus.Processing:
    case TWUOpportunityStatus.Awarded:
    case TWUOpportunityStatus.Canceled:
      return true;
    default:
      return false;
  }
}

export function canAddAddendumToTWUOpportunity(o: TWUOpportunity): boolean {
  switch (o.status) {
    case TWUOpportunityStatus.Published:
    case TWUOpportunityStatus.EvaluationResourceQuestionsIndividual:
    case TWUOpportunityStatus.EvaluationResourceQuestionsConsensus:
    case TWUOpportunityStatus.EvaluationChallenge:
    case TWUOpportunityStatus.Processing:
    case TWUOpportunityStatus.Awarded:
    case TWUOpportunityStatus.Canceled:
      return true;
    default:
      return false;
  }
}

export function canChangeEvaluationPanel(o: TWUOpportunity): boolean {
  switch (o.status) {
    case TWUOpportunityStatus.Draft:
    case TWUOpportunityStatus.UnderReview:
    case TWUOpportunityStatus.Published:
    case TWUOpportunityStatus.EvaluationResourceQuestionsIndividual:
      return true;
    default:
      return false;
  }
}

export function isTWUOpportunityClosed(o: TWUOpportunity): boolean {
  return (
    isDateInThePast(o.proposalDeadline) &&
    o.status !== TWUOpportunityStatus.Published &&
    o.status !== TWUOpportunityStatus.Draft &&
    o.status !== TWUOpportunityStatus.UnderReview
  );
}

export function hasTWUOpportunityPassedResourceQuestions(
  o: Pick<TWUOpportunity, "history">
): boolean {
  if (!o.history) {
    return false;
  }
  return o.history.reduce((acc, h) => {
    if (acc || h.type.tag !== "status") {
      return acc;
    }
    switch (h.type.value) {
      case TWUOpportunityStatus.EvaluationResourceQuestionsIndividual:
      case TWUOpportunityStatus.EvaluationResourceQuestionsConsensus:
      case TWUOpportunityStatus.EvaluationChallenge:
      case TWUOpportunityStatus.Awarded:
        return true;
      default:
        return false;
    }
  }, false as boolean);
}

/**
 * Determines if a Team With Us (TWU) opportunity has passed the challenge phase.
 *
 * This function checks the opportunity's history to see if it has ever been in a status
 * that indicates it has moved beyond the challenge evaluation phase (EvaluationChallenge,
 * Processing, or Awarded statuses).
 *
 * @param o - The TWU opportunity object containing a history property
 * @returns true if the opportunity has passed the challenge phase, false otherwise
 */
export function hasTWUOpportunityPassedChallenge(
  o: Pick<TWUOpportunity, "history">
): boolean {
  // If no history exists, the opportunity hasn't passed any phases
  if (!o.history) {
    return false;
  }
  // Reduce the history array to a single boolean value
  return o.history.reduce((acc, h) => {
    // If we've already determined it passed the challenge (acc is true)
    // or if the current history item is not a status change, maintain the current result
    if (acc || h.type.tag !== "status") {
      return acc;
    }

    // Check specific status values that indicate the opportunity has passed the challenge phase
    switch (h.type.value) {
      case TWUOpportunityStatus.EvaluationChallenge:
      case TWUOpportunityStatus.Processing:
      case TWUOpportunityStatus.Awarded:
        return true;
      default:
        return false;
    }
  }, false as boolean); // Start with false as the initial accumulator value
}

export function doesTWUOpportunityStatusAllowGovToViewProposals(
  s: TWUOpportunityStatus
): boolean {
  switch (s) {
    case TWUOpportunityStatus.Draft:
    case TWUOpportunityStatus.UnderReview:
    case TWUOpportunityStatus.Published:
      return false;
    default:
      return true;
  }
}

export function doesTWUOpportunityStatusAllowGovToViewFullProposal(
  s: TWUOpportunityStatus
): boolean {
  switch (s) {
    case TWUOpportunityStatus.EvaluationChallenge:
    case TWUOpportunityStatus.Processing:
    case TWUOpportunityStatus.Awarded:
      return true;
    default:
      return false;
  }
}

export function doesTWUOpportunityStatusAllowGovToViewResourceQuestionResponseEvaluations(
  s: TWUOpportunityStatus
): boolean {
  switch (s) {
    case TWUOpportunityStatus.EvaluationChallenge:
    case TWUOpportunityStatus.Awarded:
      return true;
    default:
      return false;
  }
}
