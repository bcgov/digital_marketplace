import { FileRecord } from 'shared/lib/resources/file';
import { CWUOpportunitySlim } from 'shared/lib/resources/opportunity/code-with-us';
import { Organization } from 'shared/lib/resources/organization';
import { UserSlim, UserType  } from 'shared/lib/resources/user';
import { ADT, BodyWithErrors, Id } from 'shared/lib/types';
import { ErrorTypeFrom } from 'shared/lib/validation/index';

export const DEFAULT_CWU_PROPOSAL_TITLE = 'Untitled';

export enum CWUProposalStatus {
  Draft        = 'DRAFT',
  Submitted    = 'SUBMITTED',
  UnderReview  = 'UNDER_REVIEW',
  Evaluated    = 'EVALUATED',
  Awarded      = 'AWARDED',
  NotAwarded   = 'NOT_AWARDED',
  Disqualified = 'DISQUALIFIED',
  Withdrawn    = 'WITHDRAWN'
}

export interface CWUProposalStatusRecord {
  id: Id;
  createdAt: Date;
  createdBy: UserSlim;
  status: CWUProposalStatus;
  note: string;
}

export interface CWUProposal {
  id: Id;
  createdBy: UserSlim;
  createdAt: Date;
  updatedBy: UserSlim;
  updatedAt: Date;
  opportunity: CWUOpportunitySlim;
  proposalText: string;
  additionalComments: string;
  proponent: ADT<'individual', CWUIndividualProponent> | ADT<'organization', Organization>;
  score: number;
  status: CWUProposalStatus;
  attachments: FileRecord[];
  statusHistory?: CWUProposalStatusRecord[];
}

export function getCWUProponentName(p: CWUProposal | CWUProposalSlim): string {
  switch (p.proponent.tag) {
    case 'individual': return p.proponent.value.legalName;
    case 'organization': return p.proponent.value.legalName;
  }
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

export function isValidStatusChange(from: CWUProposalStatus, to: CWUProposalStatus, userType: UserType, proposalDeadline: Date): boolean {
  const now = new Date();
  switch (from) {
    case CWUProposalStatus.Draft:
      return to === CWUProposalStatus.Submitted && userType === UserType.Vendor && now < proposalDeadline;

    case CWUProposalStatus.Submitted:
      return (to === CWUProposalStatus.Withdrawn && userType === UserType.Vendor) ||
             (to === CWUProposalStatus.UnderReview && userType !== UserType.Vendor && now > proposalDeadline);

    case CWUProposalStatus.UnderReview:
      return [CWUProposalStatus.Evaluated, CWUProposalStatus.Disqualified].includes(to) &&
             userType !== UserType.Vendor &&
             now > proposalDeadline;

    case CWUProposalStatus.Evaluated:
      return [CWUProposalStatus.Awarded, CWUProposalStatus.NotAwarded, CWUProposalStatus.Disqualified].includes(to) &&
             userType !== UserType.Vendor &&
             now > proposalDeadline;

    case CWUProposalStatus.Awarded:
      return ((to === CWUProposalStatus.Disqualified && userType !== UserType.Vendor) ||
             (to === CWUProposalStatus.Withdrawn && userType === UserType.Vendor)) &&
             now > proposalDeadline;

    case CWUProposalStatus.NotAwarded:
      return [CWUProposalStatus.Awarded, CWUProposalStatus.Disqualified].includes(to) &&
             userType !== UserType.Vendor &&
             now > proposalDeadline;
    default:
      return false;
  }
}

export function canCWUProposalBeAwarded(p: CWUProposal | CWUProposalSlim): boolean {
  switch (p.status) {
    case CWUProposalStatus.NotAwarded:
    case CWUProposalStatus.Evaluated:
      return true;
    default:
      return false;
  }
}

export function isTerminalCWUProposalStatus(s: CWUProposalStatus): boolean {
  switch (s) {
    case CWUProposalStatus.Disqualified:
    case CWUProposalStatus.Withdrawn:
    case CWUProposalStatus.Awarded:
    case CWUProposalStatus.NotAwarded:
      return true;
    default:
      return false;
  }
}
