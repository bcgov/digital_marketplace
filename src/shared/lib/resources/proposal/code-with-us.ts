import { FileRecord } from 'shared/lib/resources/file';
import { CWUOpportunitySlim } from 'shared/lib/resources/opportunity/code-with-us';
import { Organization } from 'shared/lib/resources/organization';
import { User } from 'shared/lib/resources/user';
import { ADT, BodyWithErrors, Id } from 'shared/lib/types';
import { ErrorTypeFrom } from 'shared/lib/validation/index';

export enum CWUProposalStatus {
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
  status: CWUProposalStatus;
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

export type CreateProponentRequestBody
  = ADT<'individual', CreateIndividualProponentRequestBody>
  | ADT<'organization', Id>;

export type UpdateProponentRequestBody = CreateProponentRequestBody;

export interface CreateRequestBody {
  opportunity: Id;
  proposalText: string;
  additionalComments: string;
  proponent: CreateProponentRequestBody;
  attachments: Id[];
}

export type CreateIndividualProponentRequestBody = Omit<CWUIndividualProponent, 'id'>;

export type CreateIndividualProponentValidationErrors = ErrorTypeFrom<CreateIndividualProponentRequestBody>;

export type CreateProponentValidationErrors
  = ADT<'individual', CreateIndividualProponentValidationErrors>
  | ADT<'organization', string[]>
  | ADT<'parseFailure', string[]>;

export interface CreateValidationErrors extends Omit<ErrorTypeFrom<CreateRequestBody> & BodyWithErrors, 'proponent' | 'attachments'> {
  proponent?: CreateProponentValidationErrors;
  attachments?: string[][];
}

export type UpdateRequestBody
  = ADT<'edit', UpdateEditRequestBody>
  | ADT<'submit', string>
  | ADT<'score', { note: string, score: number }>
  | ADT<'award', string>
  | ADT<'disqualify', string>
  | ADT<'withdraw', string>;

export type UpdateEditRequestBody = Omit<CreateRequestBody, 'opportunity'>;

type UpdateADTErrors
  = ADT<'edit', UpdateEditValidationErrors>
  | ADT<'submit', string[]>
  | ADT<'score', { score?: string[], note?: string[] }>
  | ADT<'award', string[]>
  | ADT<'disqualify', string[]>
  | ADT<'withdraw', string[]>;

export type UpdateEditValidationErrors = ErrorTypeFrom<UpdateEditRequestBody>;

export interface UpdateValidationErrors extends BodyWithErrors {
  proposal?: UpdateADTErrors;
}

export type DeleteValidationErrors = BodyWithErrors;

export function isValidStatusChange(from: CWUProposalStatus, to: CWUProposalStatus): boolean {
  switch (from) {
    case CWUProposalStatus.Draft:
      return to === CWUProposalStatus.Submitted;
    case CWUProposalStatus.Submitted:
      return [CWUProposalStatus.Withdrawn, CWUProposalStatus.Review].includes(to);
    case CWUProposalStatus.Review:
      return [CWUProposalStatus.Awarded, CWUProposalStatus.NotAwarded, CWUProposalStatus.Disqualified].includes(to);
    case CWUProposalStatus.Awarded:
      return [CWUProposalStatus.Withdrawn].includes(to);
    default:
      return false;
  }
}
