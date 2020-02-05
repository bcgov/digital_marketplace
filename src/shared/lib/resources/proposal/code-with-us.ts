import { CWUOpportunitySlim } from 'shared/lib/resources/code-with-us';
import { FileRecord } from 'shared/lib/resources/file';
import { Organization } from 'shared/lib/resources/organization';
import { User } from 'shared/lib/resources/user';
import { ADT, BodyWithErrors, Id } from 'shared/lib/types';
import { ErrorTypeFrom } from 'shared/lib/validation';

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
  updatedBy: User;
  updatedAt: Date;
  opportunity: CWUOpportunitySlim;
  proposalText: string;
  additionalComments: string;
  proponent: ADT<'individual', CWUIndividualProponent> | ADT<'organization', Organization>;
  score: number;
  status: ProposalStatus;
  attachments: FileRecord[];
}

export type CWUProposalSlim = Omit<CWUProposal, 'opportunity' | 'attachments'>;

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

export interface CreateRequestBody {
  opportunity: Id;
  proposalText: string;
  additionalComments: string;
  proponent: ADT<'individual', CreateIndividualProponentRequestBody> | ADT<'organization', Id>;
  attachments: Id[];
}

export type CreateIndividualProponentRequestBody = Omit<CWUIndividualProponent, 'id'>;

export type CreateValidationErrors = ErrorTypeFrom<CreateRequestBody> & BodyWithErrors;

export type UpdateRequestBody
  = ADT<'edit', UpdateDraftRequestBody>
  | ADT<'submit', string>
  | ADT<'score', { note: string, score: number }>
  | ADT<'award', string>
  | ADT<'suspend', string>
  | ADT<'disqualify', string>
  | ADT<'withdraw', string>;

export type UpdateDraftRequestBody = CreateIndividualProponentRequestBody;

type UpdateADTErrors
  = ADT<'edit', UpdateDraftValidationErrors>
  | ADT<'submit', string[]>
  | ADT<'score', string[]>
  | ADT<'award', string[]>
  | ADT<'suspend', string[]>
  | ADT<'disqualify', string[]>
  | ADT<'withdraw', string[]>;

export type UpdateDraftValidationErrors = ErrorTypeFrom<UpdateDraftRequestBody>;

export interface UpdateValidationErrors extends BodyWithErrors {
  proposal?: UpdateADTErrors;
}

export type DeleteValidationErrors = BodyWithErrors;
