import { Addendum } from 'shared/lib/resources/addendum';
import { FileRecord } from 'shared/lib/resources/file';
import { User } from 'shared/lib/resources/user';
import { ADT, BodyWithErrors, Id } from 'shared/lib/types';
import { ErrorTypeFrom } from 'shared/lib/validation';

export enum CWUOpportunityStatus {
  Draft = 'DRAFT',
  Published = 'PUBLISHED',
  Evaluation = 'EVALUATION',
  Awarded = 'AWARDED',
  Suspended = 'SUSPENDED',
  Canceled = 'CANCELED'
}

export interface CWUOpportunity {
  id: Id;
  createdAt: Date;
  createdBy?: User;
  updatedAt: Date;
  updatedBy?: User;
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
  completionDate: Date;
  submissionInfo: string;
  acceptanceCriteria: string;
  evaluationCriteria: string;
  status: CWUOpportunityStatus;
  attachments: FileRecord[];
  addenda: Addendum[];
}

export type CWUOpportunitySlim = Pick<CWUOpportunity, 'id' | 'title' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'status' | 'proposalDeadline'>;

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
  completionDate: string;
  submissionInfo: string;
  acceptanceCriteria: string;
  evaluationCriteria: string;
  attachments: Id[];
}

export type CreateValidationErrors = ErrorTypeFrom<CreateRequestBody> & BodyWithErrors;

export type UpdateRequestBody
  = ADT<'editDraft', UpdateDraftRequestBody>
  | ADT<'publish', string>
  | ADT<'startEvaluation', string>
  | ADT<'suspend', string>
  | ADT<'cancel', string>
  | ADT<'addAddendum', string>;

export type UpdateDraftRequestBody = CreateRequestBody;

type UpdateADTErrors
  = ADT<'editDraft', UpdateDraftValidationErrors>
  | ADT<'publish', string[]>
  | ADT<'startEvaluation', string[]>
  | ADT<'suspend', string[]>
  | ADT<'cancel', string[]>
  | ADT<'addAddendum', string[]>
  | ADT<'parseFailure'>;

export interface UpdateValidationErrors extends BodyWithErrors {
  opportunity?: UpdateADTErrors;
  proposal?: string[];
}

export type UpdateDraftValidationErrors = ErrorTypeFrom<UpdateDraftRequestBody>;
