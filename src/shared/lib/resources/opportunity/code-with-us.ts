import { CWU_MAX_BUDGET } from "shared/config";
import { formatAmount, isDateInTheFuture, isDateInThePast } from "shared/lib";
import { Addendum } from "shared/lib/resources/addendum";
import { FileRecord } from "shared/lib/resources/file";
import { UserSlim } from "shared/lib/resources/user";
import { ADT, BodyWithErrors, Id } from "shared/lib/types";
import { ErrorTypeFrom } from "shared/lib/validation";

export { Addendum } from "shared/lib/resources/addendum";

export const DEFAULT_OPPORTUNITY_TITLE = "Untitled";
export const FORMATTED_MAX_BUDGET = formatAmount(CWU_MAX_BUDGET, "$");

export enum CWUOpportunityStatus {
  Draft = "DRAFT",
  UnderReview = "UNDER_REVIEW",
  Published = "PUBLISHED",
  Evaluation = "EVALUATION",
  Processing = "PROCESSING",
  Awarded = "AWARDED",
  Suspended = "SUSPENDED",
  Canceled = "CANCELED"
}

export enum CWUOpportunityEvent {
  Edited = "EDITED",
  AddendumAdded = "ADDENDUM_ADDED",
  NoteAdded = "NOTE_ADDED"
}

/**
 * User-defined type guard to narrow raw input to a CWUOpportunityStatus.
 *
 * @see {@link https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates}
 *
 * @param raw - a string value
 * @returns boolean
 */
function isCWUOpportunityStatus(
  raw: string | CWUOpportunityStatus
): raw is CWUOpportunityStatus {
  return Object.values(CWUOpportunityStatus).includes(
    raw as CWUOpportunityStatus
  );
}

/**
 * Determines if a raw string is part of the enum CWUOpportunityStatus and returns
 * the passed value or null.
 *
 * @see {@link CWUOpportunityStatus}
 *
 * @param raw - a string value
 * @returns CWUOpportunityStatus | null
 */
export function parseCWUOpportunityStatus(
  raw: string
): CWUOpportunityStatus | null {
  return isCWUOpportunityStatus(raw) ? raw : null;
}

export interface CWUOpportunityHistoryRecord {
  id: Id;
  createdAt: Date;
  createdBy: UserSlim | null;
  type: ADT<"status", CWUOpportunityStatus> | ADT<"event", CWUOpportunityEvent>;
  note: string;
  attachments: FileRecord[];
}

export interface CWUOpportunity {
  id: Id;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: UserSlim;
  updatedBy?: UserSlim;
  successfulProponent?: CWUSuccessfulProponent;
  title: string;
  teaser: string;
  remoteOk: boolean;
  remoteDesc: string;
  location: string;
  reward: number;
  skills: string[];
  description: string;
  proposalDeadline: Date;
  assignmentDate: Date;
  startDate: Date;
  completionDate: Date | null;
  submissionInfo: string;
  acceptanceCriteria: string;
  evaluationCriteria: string;
  status: CWUOpportunityStatus;
  attachments: FileRecord[];
  addenda: Addendum[];
  history?: CWUOpportunityHistoryRecord[];
  publishedAt?: Date;
  subscribed?: boolean;
  reporting?: {
    numProposals: number;
    numWatchers: number;
    numViews: number;
  };
}

export interface CWUSuccessfulProponent {
  id: ADT<"individual", Id> | ADT<"organization", Id>;
  name: string;
  email?: string;
  score?: number;
  createdBy?: UserSlim;
}

export function isCWUOpportunityPublic(o: CWUOpportunity): boolean {
  switch (o.status) {
    case CWUOpportunityStatus.Published:
    case CWUOpportunityStatus.Evaluation:
    case CWUOpportunityStatus.Processing:
    case CWUOpportunityStatus.Awarded:
    case CWUOpportunityStatus.Canceled:
      return true;
    default:
      return false;
  }
}

export function canAddAddendumToCWUOpportunity(o: CWUOpportunity): boolean {
  switch (o.status) {
    case CWUOpportunityStatus.Published:
    case CWUOpportunityStatus.Evaluation:
    case CWUOpportunityStatus.Processing:
    case CWUOpportunityStatus.Awarded:
    case CWUOpportunityStatus.Canceled:
      return true;
    default:
      return false;
  }
}

export function canViewCWUOpportunityProposals(o: CWUOpportunity): boolean {
  // Return true if the opportunity has ever had the `Evaluation` status.
  return (
    !!o.history &&
    o.history.reduce(
      (acc, record) =>
        acc ||
        (record.type.tag === "status" &&
          record.type.value === CWUOpportunityStatus.Evaluation),
      false as boolean
    )
  );
}

export type CWUOpportunitySlim = Pick<
  CWUOpportunity,
  | "id"
  | "title"
  | "teaser"
  | "createdAt"
  | "createdBy"
  | "updatedAt"
  | "updatedBy"
  | "status"
  | "proposalDeadline"
  | "remoteOk"
  | "reward"
  | "location"
  | "subscribed"
>;

export type CreateCWUOpportunityStatus =
  | CWUOpportunityStatus.Published
  | CWUOpportunityStatus.UnderReview
  | CWUOpportunityStatus.Draft;

export interface CreateRequestBody {
  title: string;
  teaser: string;
  remoteOk: boolean;
  remoteDesc: string;
  location: string;
  reward: number;
  skills: string[];
  description: string;
  proposalDeadline: string;
  assignmentDate: string;
  startDate: string;
  completionDate?: string;
  submissionInfo: string;
  acceptanceCriteria: string;
  evaluationCriteria: string;
  attachments: Id[];
  status: CreateCWUOpportunityStatus;
}

export interface CreateValidationErrors
  extends Omit<
    ErrorTypeFrom<CreateRequestBody> & BodyWithErrors,
    "skills" | "attachments"
  > {
  skills?: string[][];
  attachments?: string[][];
}

export type UpdateRequestBody =
  | ADT<"edit", UpdateEditRequestBody>
  | ADT<"submitForReview", string>
  | ADT<"publish", string>
  | ADT<"cancel", string>
  | ADT<"addAddendum", string>
  | ADT<"addNote", UpdateWithNoteRequestBody>;

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
  | ADT<"cancel", string[]>
  | ADT<"addAddendum", string[]>
  | ADT<"parseFailure">
  | ADT<"addNote", UpdateWithNoteValidationErrors>;

export interface UpdateValidationErrors extends BodyWithErrors {
  opportunity?: UpdateADTErrors;
}

export interface UpdateEditValidationErrors
  extends Omit<ErrorTypeFrom<UpdateEditRequestBody>, "attachments" | "skills"> {
  attachments?: string[][];
  skills?: string[][];
}

export type DeleteValidationErrors = BodyWithErrors;

export function isValidStatusChange(
  from: CWUOpportunityStatus,
  to: CWUOpportunityStatus
): boolean {
  switch (from) {
    case CWUOpportunityStatus.Draft:
      return [
        CWUOpportunityStatus.UnderReview,
        CWUOpportunityStatus.Published
      ].includes(to);
    case CWUOpportunityStatus.UnderReview:
      return [CWUOpportunityStatus.Published].includes(to);
    case CWUOpportunityStatus.Published:
      return [
        CWUOpportunityStatus.Canceled,
        CWUOpportunityStatus.Evaluation
      ].includes(to);
    case CWUOpportunityStatus.Evaluation:
      return [
        CWUOpportunityStatus.Canceled,
        CWUOpportunityStatus.Processing
      ].includes(to);
    case CWUOpportunityStatus.Processing:
      return [
        CWUOpportunityStatus.Canceled,
        CWUOpportunityStatus.Awarded
      ].includes(to);
    default:
      return false;
  }
}

export function canCWUOpportunityBeAwarded(o: CWUOpportunity): boolean {
  switch (o.status) {
    case CWUOpportunityStatus.Processing:
    case CWUOpportunityStatus.Awarded:
      return true;
    default:
      return false;
  }
}

export function canCWUOpportunityDetailsBeEdited(
  o: CWUOpportunity,
  adminsOnly: boolean
): boolean {
  switch (o.status) {
    case CWUOpportunityStatus.Draft:
    case CWUOpportunityStatus.UnderReview:
      return true;
    case CWUOpportunityStatus.Published:
      return adminsOnly;
    default:
      return false;
  }
}

export const publicOpportunityStatuses: readonly CWUOpportunityStatus[] = [
  CWUOpportunityStatus.Published,
  CWUOpportunityStatus.Evaluation,
  CWUOpportunityStatus.Processing,
  CWUOpportunityStatus.Awarded,
  CWUOpportunityStatus.Canceled
];

export const privateOpportunityStatuses: readonly CWUOpportunityStatus[] = [
  CWUOpportunityStatus.Draft,
  CWUOpportunityStatus.UnderReview
];

export function isCWUOpportunityAcceptingProposals(
  o: Pick<CWUOpportunity, "status" | "proposalDeadline">
): boolean {
  return (
    o.status === CWUOpportunityStatus.Published &&
    isDateInTheFuture(o.proposalDeadline)
  );
}

export function isUnpublished(o: Pick<CWUOpportunity, "status">): boolean {
  return (
    o.status === CWUOpportunityStatus.Draft ||
    o.status === CWUOpportunityStatus.UnderReview
  );
}

export function isOpen(
  o: Pick<CWUOpportunity, "status" | "proposalDeadline">
): boolean {
  return isCWUOpportunityAcceptingProposals(o);
}

export function isClosed(
  o: Pick<CWUOpportunity, "status" | "proposalDeadline">
): boolean {
  return !isOpen(o) && !isUnpublished(o);
}

export function doesCWUOpportunityStatusAllowGovToViewProposals(
  s: CWUOpportunityStatus
): boolean {
  switch (s) {
    case CWUOpportunityStatus.Draft:
    case CWUOpportunityStatus.UnderReview:
    case CWUOpportunityStatus.Published:
      return false;
    default:
      return true;
  }
}

export function isCWUOpportunityClosed(o: CWUOpportunity): boolean {
  return (
    isDateInThePast(o.proposalDeadline) &&
    o.status !== CWUOpportunityStatus.Published &&
    o.status !== CWUOpportunityStatus.Draft &&
    o.status !== CWUOpportunityStatus.UnderReview
  );
}
