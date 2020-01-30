import { Addendum } from 'shared/lib/resources/addendum';
import { FileRecord } from 'shared/lib/resources/file';
import { User } from 'shared/lib/resources/user';
import { BodyWithErrors, Id } from 'shared/lib/types';
import { ErrorTypeFrom } from 'shared/lib/validation/index';

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
  updatedAt: Date;

  createdBy?: User;
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

export type CWUOpportunitySlim = Pick<CWUOpportunity, 'title' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'status' | 'proposalDeadline'>;

export type CreateRequestBody = Omit<CWUOpportunity, 'id' | 'createdAt' | 'updatedAt' >;

export type CreateValidationErrors = ErrorTypeFrom<CreateRequestBody> & BodyWithErrors;

export type UpdateRequestBody = CreateRequestBody;

export type UpdateValidationErrors = ErrorTypeFrom<UpdateRequestBody> & BodyWithErrors;

export type DeleteValidationErrors = BodyWithErrors;
