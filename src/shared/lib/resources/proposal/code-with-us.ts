import { FileRecord } from 'shared/lib/resources/file';
import { CWUOpportunitySlim } from 'shared/lib/resources/opportunity/code-with-us';
import { Organization } from 'shared/lib/resources/organization';
import { UserSlim, UserType  } from 'shared/lib/resources/user';
import { ADT, adt, BodyWithErrors, Id } from 'shared/lib/types';
import { ErrorTypeFrom } from 'shared/lib/validation';

export enum CWUProposalStatus {
  Draft = 'DRAFT',
  Submitted = 'SUBMITTED',
  UnderReview = 'UNDER_REVIEW',
  Evaluated = 'EVALUATED',
  Awarded = 'AWARDED',
  NotAwarded = 'NOT_AWARDED',
  Disqualified = 'DISQUALIFIED',
  Withdrawn = 'WITHDRAWN'
}

export enum CWUProposalEvent {
  ScoreEntered = 'SCORE_ENTERED'
}

export function parseCWUProposalStatus(raw: string): CWUProposalStatus | null {
  switch (raw) {
    case CWUProposalStatus.Draft: return CWUProposalStatus.Draft;
    case CWUProposalStatus.Submitted: return CWUProposalStatus.Submitted;
    case CWUProposalStatus.UnderReview: return CWUProposalStatus.UnderReview;
    case CWUProposalStatus.Evaluated: return CWUProposalStatus.Evaluated;
    case CWUProposalStatus.Awarded: return CWUProposalStatus.Awarded;
    case CWUProposalStatus.NotAwarded: return CWUProposalStatus.NotAwarded;
    case CWUProposalStatus.Disqualified: return CWUProposalStatus.Disqualified;
    case CWUProposalStatus.Withdrawn: return CWUProposalStatus.Withdrawn;
    default: return null;
  }
}

export interface CWUProposalHistoryRecord {
  id: Id;
  createdAt: Date;
  createdBy: UserSlim;
  type: ADT<'status', CWUProposalStatus> | ADT<'event', CWUProposalEvent>;
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
  history?: CWUProposalHistoryRecord[];
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

export function createBlankIndividualProponent(): CreateProponentRequestBody  {
  return adt('individual', {
    legalName: '',
    email: '',
    phone: '',
    street1: '',
    street2: '',
    city: '',
    region: '',
    mailCode: '',
    country: ''
  });
}

export type UpdateProponentRequestBody = CreateProponentRequestBody;

export type CreateCWUProposalStatus
  = CWUProposalStatus.Draft
  | CWUProposalStatus.Submitted;

export interface CreateRequestBody {
  opportunity: Id;
  proposalText: string;
  additionalComments: string;
  proponent: CreateProponentRequestBody;
  attachments: Id[];
  status: CreateCWUProposalStatus;
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

export type UpdateEditRequestBody = Omit<CreateRequestBody, 'opportunity' | 'status'>;

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
