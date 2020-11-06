import { compareNumbers, compareStrings, isDateInThePast } from 'shared/lib';
import { FileRecord } from 'shared/lib/resources/file';
import { CWUOpportunitySlim } from 'shared/lib/resources/opportunity/code-with-us';
import { Organization } from 'shared/lib/resources/organization';
import { UserSlim, UserType } from 'shared/lib/resources/user';
import { ADT, adt, BodyWithErrors, Comparison, Id } from 'shared/lib/types';
import { ErrorTypeFrom } from 'shared/lib/validation';

export const DEFAULT_CWU_PROPOSAL_TITLE = 'Unknown';
export const NUM_SCORE_DECIMALS = 2;

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

export enum CWUProposalEvent {
  ScoreEntered = 'SCORE_ENTERED',
  NoteAdded = 'NOTE_ADDED'
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

function quantifyCWUProposalStatusForSort(a: CWUProposalStatus): number {
  // 0 = first
  switch (a) {
    case CWUProposalStatus.Awarded: return 0;
    case CWUProposalStatus.NotAwarded: return 1;
    case CWUProposalStatus.UnderReview:
    case CWUProposalStatus.Evaluated:
      return 2;
    case CWUProposalStatus.Withdrawn: return 3;
    case CWUProposalStatus.Disqualified: return 4;
    case CWUProposalStatus.Draft:
    case CWUProposalStatus.Submitted:
      return 5;
  }
}

export function compareCWUProposalStatuses(a: CWUProposalStatus, b: CWUProposalStatus): Comparison {
  return compareNumbers(quantifyCWUProposalStatusForSort(a), quantifyCWUProposalStatusForSort(b));
}

export function compareCWUProposalsForPublicSector(a: CWUProposalSlim, b: CWUProposalSlim): Comparison {
  const statusComparison = compareCWUProposalStatuses(a.status, b.status);
  if (statusComparison !== 0) { return statusComparison; }
  // Compare by score.
  // Give precendence to scored proposals.
  if (a.score === undefined && b.score !== undefined) { return 1; }
  if (a.score !== undefined && b.score === undefined) { return -1; }
  if (a.score !== undefined && b.score !== undefined) {
    // If scores are not the same, sort by score, highest first.
    const result = (compareNumbers(a.score, b.score) * -1) as Comparison;
    if (result) { return result; }
  }
  // Fallback to sorting by proponent name.
  return compareStrings(getCWUProponentName(a), getCWUProponentName(b));
}

export interface CWUProposalHistoryRecord {
  id: Id;
  createdAt: Date;
  createdBy: UserSlim | null;
  type: ADT<'status', CWUProposalStatus> | ADT<'event', CWUProposalEvent>;
  note: string;
  attachments: FileRecord[];
}

export interface CWUProposal {
  id: Id;
  createdBy: UserSlim;
  createdAt: Date;
  updatedBy?: UserSlim;
  updatedAt: Date;
  submittedAt?: Date;
  opportunity: CWUOpportunitySlim;
  proposalText: string;
  additionalComments: string;
  proponent: CWUProponent;
  score?: number;
  rank?: number;
  status: CWUProposalStatus;
  attachments: FileRecord[];
  history?: CWUProposalHistoryRecord[];
}

export function getCWUProponentName(p: CWUProposal | CWUProposalSlim): string {
  switch (p.proponent.tag) {
    case 'individual': return p.proponent.value.legalName;
    case 'organization': return p.proponent.value.legalName;
  }
}

export function getCWUProponentEmail(p: CWUProposal | CWUProposalSlim): string {
  switch (p.proponent.tag) {
    case 'individual': return p.proponent.value.email;
    case 'organization': return p.proponent.value.contactEmail;
  }
}

export function getCWUProponentId(p: CWUProposal | CWUProposalSlim): ADT<'individual', Id> | ADT<'organization', Id> {
  return adt(p.proponent.tag, p.proponent.value.id);
}

export function getCWUProponentTypeTitleCase(p: CWUProposal | CWUProposalSlim): string {
  switch (p.proponent.tag) {
    case 'individual': return 'Individual';
    case 'organization': return 'Organization';
  }
}

export type CWUProposalSlim = Omit<CWUProposal, 'proposalText' | 'additionalComments' | 'history' | 'attachments'>;

type CWUProponent = ADT<'individual', CWUIndividualProponent> | ADT<'organization', Organization>;

export interface CWUIndividualProponent {
  id: Id;
  legalName: string;
  email: string;
  phone?: string;
  street1: string;
  street2?: string;
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
    phone: null,
    street1: '',
    street2: null,
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

export interface CreateIndividualProponentRequestBody extends Omit<CWUIndividualProponent, 'id' | 'phone' | 'street2'> {
  phone: string | null;
  street2: string | null;
}

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
  | ADT<'score', number>
  | ADT<'award', string>
  | ADT<'disqualify', string>
  | ADT<'withdraw', string>
  | ADT<'addNote', UpdateWithNoteRequestBody>;

export type UpdateEditRequestBody = Omit<CreateRequestBody, 'opportunity' | 'status'>;

export interface UpdateWithNoteRequestBody {
  note: string;
  attachments: Id[];
}

export interface UpdateWithNoteValidationErrors extends Omit<ErrorTypeFrom<UpdateWithNoteRequestBody>, 'attachments'> {
  attachments?: string[][];
}

type UpdateADTErrors
  = ADT<'edit', UpdateEditValidationErrors>
  | ADT<'submit', string[]>
  | ADT<'score', string[]>
  | ADT<'award', string[]>
  | ADT<'disqualify', string[]>
  | ADT<'withdraw', string[]>
  | ADT<'addNote', UpdateWithNoteValidationErrors>
  | ADT<'parseFailure'>;

export interface UpdateEditValidationErrors extends ErrorTypeFrom<Omit<UpdateEditRequestBody, 'proponent' | 'attachments'>> {
  proponent?: CreateProponentValidationErrors;
  attachments?: string[][];
}

export interface UpdateValidationErrors extends BodyWithErrors {
  proposal?: UpdateADTErrors;
}

export interface DeleteValidationErrors extends BodyWithErrors {
  status?: string[];
}

export function isValidStatusChange(from: CWUProposalStatus, to: CWUProposalStatus, userType: UserType, proposalDeadline: Date): boolean {
  const hasProposalDeadlinePassed = isDateInThePast(proposalDeadline);
  switch (from) {
    case CWUProposalStatus.Draft:
      return to === CWUProposalStatus.Submitted && userType === UserType.Vendor && !hasProposalDeadlinePassed;

    case CWUProposalStatus.Submitted:
      return (to === CWUProposalStatus.Withdrawn && userType === UserType.Vendor) ||
             (to === CWUProposalStatus.UnderReview && userType !== UserType.Vendor && hasProposalDeadlinePassed);

    case CWUProposalStatus.UnderReview:
      return (([CWUProposalStatus.Evaluated, CWUProposalStatus.Disqualified].includes(to) && userType !== UserType.Vendor) ||
             (to === CWUProposalStatus.Withdrawn && userType === UserType.Vendor)) &&
             hasProposalDeadlinePassed;

    case CWUProposalStatus.Evaluated:
      return (([CWUProposalStatus.Evaluated, CWUProposalStatus.Awarded, CWUProposalStatus.NotAwarded, CWUProposalStatus.Disqualified].includes(to) && userType !== UserType.Vendor) ||
             (to === CWUProposalStatus.Withdrawn && userType === UserType.Vendor)) &&
             hasProposalDeadlinePassed;

    case CWUProposalStatus.Awarded:
      return ((to === CWUProposalStatus.Disqualified && userType !== UserType.Vendor) ||
             (to === CWUProposalStatus.Withdrawn && userType === UserType.Vendor)) &&
             hasProposalDeadlinePassed;

    case CWUProposalStatus.NotAwarded:
      return [CWUProposalStatus.Awarded, CWUProposalStatus.Disqualified].includes(to) &&
             userType !== UserType.Vendor &&
             hasProposalDeadlinePassed;

    case CWUProposalStatus.Withdrawn:
      return userType === UserType.Vendor &&
             !hasProposalDeadlinePassed &&
             to === CWUProposalStatus.Submitted;
    default:
      return false;
  }
}

export function canCWUProposalBeAwarded(p: Pick<CWUProposal, 'status'>): boolean {
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

export function isRankableCWUProposalStatus(s: CWUProposalStatus): boolean {
  switch (s) {
    case CWUProposalStatus.Evaluated:
    case CWUProposalStatus.Awarded:
    case CWUProposalStatus.NotAwarded:
      return true;
    default:
      return false;
  }
}

export function isCWUProposalStatusVisibleToGovernment(s: CWUProposalStatus, role: UserType.Government | UserType.Admin): boolean {
  switch (s) {
    case CWUProposalStatus.Draft:
    case CWUProposalStatus.Submitted:
      return false;
    case CWUProposalStatus.Withdrawn:
      return role === UserType.Admin;
    default:
      return true;
  }
}
