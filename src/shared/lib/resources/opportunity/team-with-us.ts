import { isDateInTheFuture, isDateInThePast } from "shared/lib";
import { Addendum } from "shared/lib/resources/addendum";
import { FileRecord } from "shared/lib/resources/file";
import { UserSlim } from "shared/lib/resources/user";
import { ADT, BodyWithErrors, Id } from "shared/lib/types";
import { ErrorTypeFrom } from "shared/lib/validation";

export { Addendum } from "shared/lib/resources/addendum";

export const DEFAULT_OPPORTUNITY_TITLE = "Untitled";
export const DEFAULT_QUESTIONS_WEIGHT = 25;
export const DEFAULT_CODE_CHALLENGE_WEIGHT = 50;
export const DEFAULT_PRICE_WEIGHT = 25;
export const MAX_RESOURCE_QUESTIONS = 100;
export const MAX_RESOURCE_QUESTION_WORD_LIMIT = 3000;
export const DEFAULT_RESOURCE_QUESTION_RESPONSE_WORD_LIMIT = 300;
export const DEFAULT_RESOURCE_QUESTION_AVAILABLE_SCORE = 5;

export enum TWUOpportunityStatus {
  Draft = "DRAFT",
  UnderReview = "UNDER_REVIEW",
  Published = "PUBLISHED",
  EvaluationResourceQuestions = "EVAL_QUESTIONS",
  EvaluationChallenge = "EVAL_C",
  Awarded = "AWARDED",
  Suspended = "SUSPENDED",
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
  DevopsSpecialist = "DEVOPS_SPECIALIST"
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
    case TWUOpportunityStatus.EvaluationResourceQuestions:
    case TWUOpportunityStatus.EvaluationChallenge:
      return true;
    default:
      return false;
  }
}

export const publicOpportunityStatuses: readonly TWUOpportunityStatus[] = [
  TWUOpportunityStatus.Published,
  TWUOpportunityStatus.EvaluationResourceQuestions,
  TWUOpportunityStatus.EvaluationChallenge,
  TWUOpportunityStatus.Awarded
];

export const privateOpportunityStatuses: readonly TWUOpportunityStatus[] = [
  TWUOpportunityStatus.Draft,
  TWUOpportunityStatus.UnderReview,
  TWUOpportunityStatus.Canceled,
  TWUOpportunityStatus.Suspended
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
    o.status === TWUOpportunityStatus.UnderReview ||
    o.status === TWUOpportunityStatus.Suspended
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
  TWUOpportunityStatus.Published,
  TWUOpportunityStatus.Suspended
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
  // mandatorySkills: string[];
  // optionalSkills: string[];
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
}

export interface TWUResource {
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
export type CreateTWUResourceBody = Omit<TWUResource, "serviceArea"> & {
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
}

export interface CreateTWUResourceQuestionValidationErrors
  extends ErrorTypeFrom<CreateTWUResourceQuestionBody> {
  parseFailure?: string[];
}

export interface CreateTWUResourceValidationErrors
  extends ErrorTypeFrom<CreateTWUResourceBody> {
  parseFailure?: string[];
}

export interface CreateValidationErrors
  extends Omit<
    ErrorTypeFrom<CreateRequestBody> & BodyWithErrors,
    | "resources"
    | "mandatorySkills"
    | "optionalSkills"
    | "resourceQuestions"
    | "attachments"
  > {
  resources?: CreateTWUResourceValidationErrors[];
  mandatorySkills?: string[][];
  optionalSkills?: string[][];
  resourceQuestions?: CreateTWUResourceQuestionValidationErrors[];
  attachments?: string[][];
  scoreWeights?: string[];
}

// Update.

export type UpdateRequestBody =
  | ADT<"edit", UpdateEditRequestBody>
  | ADT<"submitForReview", string>
  | ADT<"publish", string>
  | ADT<"startChallenge", string>
  | ADT<"suspend", string>
  | ADT<"cancel", string>
  | ADT<"addAddendum", string>;

export type UpdateEditRequestBody = Omit<CreateRequestBody, "status">;

export interface UpdateWithNoteRequestBody {
  note: string;
  attachments: Id[];
}

export interface UpdateWithNoteValidationErrors
  extends Omit<ErrorTypeFrom<UpdateWithNoteRequestBody>, "attachments"> {
  attachments?: string[][];
}

type UpdateADTErrors =
  | ADT<"edit", UpdateEditValidationErrors>
  | ADT<"submitForReview", string[]>
  | ADT<"publish", string[]>
  | ADT<"startChallenge", string[]>
  | ADT<"suspend", string[]>
  | ADT<"cancel", string[]>
  | ADT<"addAddendum", string[]>
  | ADT<"addNote", UpdateWithNoteValidationErrors>
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
  > {
  resources?: CreateTWUResourceValidationErrors[];
  mandatorySkills?: string[][];
  optionalSkills?: string[][];
  resourceQuestions?: CreateTWUResourceQuestionValidationErrors[];
  attachments?: string[][];
  scoreWeights?: string[];
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
      return [
        TWUOpportunityStatus.Published,
        TWUOpportunityStatus.Suspended
      ].includes(to);
    case TWUOpportunityStatus.Published:
      return [
        TWUOpportunityStatus.Canceled,
        TWUOpportunityStatus.Suspended,
        TWUOpportunityStatus.EvaluationResourceQuestions
      ].includes(to);
    case TWUOpportunityStatus.EvaluationResourceQuestions:
      return [
        TWUOpportunityStatus.Canceled,
        TWUOpportunityStatus.Suspended,
        TWUOpportunityStatus.EvaluationChallenge
      ].includes(to);
    case TWUOpportunityStatus.EvaluationChallenge:
      return [
        TWUOpportunityStatus.Canceled,
        TWUOpportunityStatus.Suspended
      ].includes(to);
    case TWUOpportunityStatus.Suspended:
      return [
        TWUOpportunityStatus.Published,
        TWUOpportunityStatus.Canceled
      ].includes(to);
    default:
      return false;
  }
}

export function canTWUOpportunityBeScreenedInToChallenge(
  o: TWUOpportunity
): boolean {
  switch (o.status) {
    case TWUOpportunityStatus.EvaluationResourceQuestions:
      return true;
    default:
      return false;
  }
}

export function canTWUOpportunityBeAwarded(o: TWUOpportunity): boolean {
  switch (o.status) {
    case TWUOpportunityStatus.EvaluationChallenge:
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

export function canTWUOpportunityDetailsBeEdited(
  o: TWUOpportunity,
  adminsOnly: boolean
): boolean {
  switch (o.status) {
    case TWUOpportunityStatus.Draft:
    case TWUOpportunityStatus.UnderReview:
      return true;
    case TWUOpportunityStatus.Published:
    case TWUOpportunityStatus.Suspended:
      return adminsOnly;
    default:
      return false;
  }
}

export function isTWUOpportunityPublic(o: TWUOpportunity): boolean {
  switch (o.status) {
    case TWUOpportunityStatus.Published:
    case TWUOpportunityStatus.EvaluationResourceQuestions:
    case TWUOpportunityStatus.EvaluationChallenge:
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
    case TWUOpportunityStatus.EvaluationResourceQuestions:
    case TWUOpportunityStatus.EvaluationChallenge:
    case TWUOpportunityStatus.Awarded:
    case TWUOpportunityStatus.Suspended:
    case TWUOpportunityStatus.Canceled:
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
    o.status !== TWUOpportunityStatus.UnderReview &&
    o.status !== TWUOpportunityStatus.Suspended
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
      case TWUOpportunityStatus.EvaluationResourceQuestions:
      case TWUOpportunityStatus.EvaluationChallenge:
      case TWUOpportunityStatus.Awarded:
        return true;
      default:
        return false;
    }
  }, false as boolean);
}

export function hasTWUOpportunityPassedChallenge(
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
      case TWUOpportunityStatus.EvaluationChallenge:
      case TWUOpportunityStatus.Awarded:
        return true;
      default:
        return false;
    }
  }, false as boolean);
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
    case TWUOpportunityStatus.Awarded:
      return true;
    default:
      return false;
  }
}
