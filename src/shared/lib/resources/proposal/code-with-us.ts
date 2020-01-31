import { CWUOpportunitySlim } from 'shared/lib/resources/code-with-us';
import { FileRecord } from 'shared/lib/resources/file';
import { Organization } from 'shared/lib/resources/organization';
import { User } from 'shared/lib/resources/user';
import { ADT, BodyWithErrors, Id  } from 'shared/lib/types';
import { ErrorTypeFrom } from 'shared/lib/validation/index';

export enum ProposalStatus {
  Draft = 'DRAFT',
  Submitted = 'SUBMITTED',
  Review = 'REVIEW',
  Awarded = 'AWARDED',
  NotAwarded = 'NOT_AWARDED',
  Disqualified = 'DISQUALIFIED',
  Withdrawn = 'WITHDRAWN'
}

export interface CWUProposal {
  id: Id;
  createdBy: User;
  createdAt: Date;
  opportunity: CWUOpportunitySlim;
  proposalText: string;
  additionalComments: string;
  proponent: ADT<'individual', CWUIndividualProponent> | ADT<'organization', Organization>;
  score: number;
  status: ProposalStatus;
  attachments: FileRecord;
}

export type CWUProposalSlim = Omit<CWUProposal, 'attachments'>;

export interface CWUIndividualProponent {
  id: Id;
  legalName: string;
  email: string;
  phone: string;
  street1: string;
  street2: string;
  city: string;
  region: string;
  mailCode: string;
  country: string;
}

export type CwuProposalSlim = CWUProposal;

export type CreateRequestBody = Omit<CWUProposal, 'id' | 'createdBy' | 'updatedAt' >;

export type CreateValidationErrors = ErrorTypeFrom<CreateRequestBody> & BodyWithErrors;

export type UpdateRequestBody = CreateRequestBody;

export type UpdateValidationErrors = ErrorTypeFrom<UpdateRequestBody> & BodyWithErrors;

export type DeleteValidationErrors = BodyWithErrors;
