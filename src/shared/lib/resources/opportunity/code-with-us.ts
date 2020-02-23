import { Addendum } from 'shared/lib/resources/addendum';
import { FileRecord } from 'shared/lib/resources/file';
import { UserSlim } from 'shared/lib/resources/user';
import { ADT, BodyWithErrors, Id } from 'shared/lib/types';
import { ErrorTypeFrom } from 'shared/lib/validation';

export { Addendum } from 'shared/lib/resources/addendum';

export const DEFAULT_OPPORTUNITY_TITLE = 'Untitled';

export enum CWUOpportunityStatus {
  Draft = 'DRAFT',
  Published = 'PUBLISHED',
  Evaluation = 'EVALUATION',
  Awarded = 'AWARDED',
  Suspended = 'SUSPENDED',
  Canceled = 'CANCELED'
}

export enum CWUOpportunityEvent {
  Edited = 'EDITED',
  AddendumAdded = 'ADDENDUM_ADDED'
}

export function parseCWUOpportunityStatus(raw: string): CWUOpportunityStatus | null {
  switch (raw) {
    case CWUOpportunityStatus.Draft: return CWUOpportunityStatus.Draft;
    case CWUOpportunityStatus.Published: return CWUOpportunityStatus.Published;
    case CWUOpportunityStatus.Evaluation: return CWUOpportunityStatus.Evaluation;
    case CWUOpportunityStatus.Awarded: return CWUOpportunityStatus.Awarded;
    case CWUOpportunityStatus.Suspended: return CWUOpportunityStatus.Suspended;
    case CWUOpportunityStatus.Canceled: return CWUOpportunityStatus.Canceled;
    default: return null;
  }
}

export interface CWUOpportunityHistoryRecord {
  id: Id;
  createdAt: Date;
  createdBy: UserSlim | null;
  type: ADT<'status', CWUOpportunityStatus> | ADT<'event', CWUOpportunityEvent>;
  note: string;
}

export interface CWUOpportunity {
  id: Id;
  createdAt: Date;
  updatedAt: Date;

  createdBy?: UserSlim;
  updatedBy?: UserSlim;

  // TODO
  successfulProponent?: true;

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
  statusHistory?: CWUOpportunityHistoryRecord[];
  publishedAt?: Date;
  subscribed?: boolean;

  // TODO
  reporting?: {
    numProposals: number;
    numWatchers: number;
    numViews: number;
  };
}

export function isCWUOpportunityPublic(o: CWUOpportunity): boolean {
  switch (o.status) {
    case CWUOpportunityStatus.Published:
    case CWUOpportunityStatus.Evaluation:
    case CWUOpportunityStatus.Awarded:
      return true;
    default:
      return false;
  }
}

export function canAddAddendumToCWUOpportunity(o: CWUOpportunity): boolean {
  switch (o.status) {
    case CWUOpportunityStatus.Published:
    case CWUOpportunityStatus.Evaluation:
    case CWUOpportunityStatus.Awarded:
    case CWUOpportunityStatus.Suspended:
      return true;
    default:
      return false;
  }
}

export type CWUOpportunitySlim = Pick<CWUOpportunity, 'id' | 'title' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'status' | 'proposalDeadline'>;

export type CreateCWUOpportunityStatus
  = CWUOpportunityStatus.Published
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

export interface CreateValidationErrors extends Omit<ErrorTypeFrom<CreateRequestBody> & BodyWithErrors, 'skills' | 'attachments'> {
  skills?: string[][];
  attachments?: string[][];
}

export type UpdateRequestBody
  = ADT<'edit', UpdateEditRequestBody>
  | ADT<'publish', string>
  | ADT<'suspend', string>
  | ADT<'cancel', string>
  | ADT<'addAddendum', string>;

export type UpdateEditRequestBody = Omit<CreateRequestBody, 'status'>;

type UpdateADTErrors
  = ADT<'edit', UpdateEditValidationErrors>
  | ADT<'publish', string[]>
  | ADT<'suspend', string[]>
  | ADT<'cancel', string[]>
  | ADT<'addAddendum', string[]>
  | ADT<'parseFailure'>;

export interface UpdateValidationErrors extends BodyWithErrors {
  opportunity?: UpdateADTErrors;
}

export interface UpdateEditValidationErrors extends Omit<ErrorTypeFrom<UpdateEditRequestBody>, 'attachments' | 'skills'> {
  attachments?: string[][];
  skills?: string[][];
}

export type DeleteValidationErrors = BodyWithErrors;

export function isValidStatusChange(from: CWUOpportunityStatus, to: CWUOpportunityStatus): boolean {
  switch (from) {
    case CWUOpportunityStatus.Draft:
      return to === CWUOpportunityStatus.Published;
    case CWUOpportunityStatus.Published:
      return [CWUOpportunityStatus.Canceled, CWUOpportunityStatus.Suspended, CWUOpportunityStatus.Evaluation].includes(to);
    case CWUOpportunityStatus.Evaluation:
      return [CWUOpportunityStatus.Canceled, CWUOpportunityStatus.Suspended, CWUOpportunityStatus.Awarded].includes(to);
    case CWUOpportunityStatus.Suspended:
      return [CWUOpportunityStatus.Published, CWUOpportunityStatus.Canceled].includes(to);
    default:
      return false;
  }
}

export const publicOpportunityStatuses: readonly CWUOpportunityStatus[] = [CWUOpportunityStatus.Published, CWUOpportunityStatus.Evaluation, CWUOpportunityStatus.Awarded];

export const privateOpportunitiesStatuses: readonly CWUOpportunityStatus[] = [CWUOpportunityStatus.Draft, CWUOpportunityStatus.Canceled, CWUOpportunityStatus.Suspended];
