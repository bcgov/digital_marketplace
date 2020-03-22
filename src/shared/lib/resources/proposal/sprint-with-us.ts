import { FileRecord } from 'shared/lib/resources/file';
import { SWUOpportunitySlim } from 'shared/lib/resources/opportunity/sprint-with-us';
import { OrganizationSlim } from 'shared/lib/resources/organization';
import { UserSlim } from 'shared/lib/resources/user';
import { ADT, BodyWithErrors, Id } from 'shared/lib/types';
import { ErrorTypeFrom } from 'shared/lib/validation';

export const DEFAULT_SWU_PROPOSAL_TITLE = 'Unknown';

export enum SWUProposalPhaseType {
  Inception = 'INCEPTION',
  Prototype = 'PROTOTYPE',
  Implementation = 'IMPLEMENTATION'
}

export enum SWUProposalStatus {
  Draft        = 'DRAFT',
  Submitted    = 'SUBMITTED',
  UnderReview  = 'UNDER_REVIEW',
  Evaluated    = 'EVALUATED',
  Awarded      = 'AWARDED',
  NotAwarded   = 'NOT_AWARDED',
  Disqualified = 'DISQUALIFIED',
  Withdrawn    = 'WITHDRAWN'
}

export enum SWUProposalEvent {
  QuestionsScoreEntered = 'QUESTIONS_SCORE_ENTERED',
  ChallengeScoreEntered = 'CHALLENGE_SCORE_ENTERED',
  ScenarioScoreEntered = 'SCENARIO_SCORE_ENTERED',
  PriceScoreEntered = 'PRICE_SCORE_ENTERED'
}

export function parseSWUProposalStatus(raw: string): SWUProposalStatus | null {
  switch (raw) {
    case SWUProposalStatus.Draft: return SWUProposalStatus.Draft;
    case SWUProposalStatus.Submitted: return SWUProposalStatus.Submitted;
    case SWUProposalStatus.UnderReview: return SWUProposalStatus.UnderReview;
    case SWUProposalStatus.Evaluated: return SWUProposalStatus.Evaluated;
    case SWUProposalStatus.Awarded: return SWUProposalStatus.Awarded;
    case SWUProposalStatus.NotAwarded: return SWUProposalStatus.NotAwarded;
    case SWUProposalStatus.Disqualified: return SWUProposalStatus.Disqualified;
    case SWUProposalStatus.Withdrawn: return SWUProposalStatus.Withdrawn;
    default: return null;
  }
}

export interface SWUProposal {
  id: Id;
  createdBy?: UserSlim;
  createdAt: Date;
  updatedBy?: UserSlim;
  updatedAt: Date;
  status: SWUProposalStatus;
  history?: SWUProposalHistoryRecord[];
  submittedAt?: Date;
  opportunity: SWUOpportunitySlim;
  organization: OrganizationSlim;
  inceptionPhase?: SWUProposalPhase;
  prototypePhase?: SWUProposalPhase;
  implementationPhase: SWUProposalPhase;
  references: SWUProposalReference[];
  attachments: FileRecord[];
  teamQuestionResponses: SWUProposalTeamQuestionResponse[];
  questionsScore?: number;
  challengeScore?: number;
  scenarioScore?: number;
  priceScore?: number;
  rank?: number;
}

export interface SWUProposalPhase {
  phase: SWUProposalPhaseType;
  members: SWUProposalTeamMember[];
  proposedCost: number;
}

export interface SWUProposalTeamMember {
  member: UserSlim;
  scrumMaster: boolean;
  pending: boolean;
}

export interface SWUProposalReference {
  name: string;
  company: string;
  phone: string;
  email: string;
  order: number;
}

export interface SWUProposalTeamQuestionResponse {
  response: string;
  order: number;
}

export interface SWUProposalHistoryRecord {
  createdAt: Date;
  createdBy: UserSlim | null;
  type: ADT<'status', SWUProposalStatus> | ADT<'event', SWUProposalEvent>;
  note: string;
}

export type SWUProposalSlim = Omit<SWUProposal, 'history' | 'opportunity' | 'attachments'>;

// Create.

export type CreateSWUProposalStatus
  = SWUProposalStatus.Draft
  | SWUProposalStatus.Submitted;

export interface CreateSWUProposalTeamMemberBody {
  member: Id;
  scrumMaster: boolean;
  pending: boolean;
}

export interface CreateSWUProposalPhaseBody {
  members: CreateSWUProposalTeamMemberBody[];
  proposedCost: number;
}

export type CreateSWUProposalReferenceBody = SWUProposalReference;

export type CreateSWUProposalTeamQuestionResponseBody = SWUProposalTeamQuestionResponse;

export interface CreateRequestBody {
  opportunity: Id;
  organization: Id;
  inceptionPhase?: CreateSWUProposalPhaseBody;
  prototypePhase?: CreateSWUProposalPhaseBody;
  implementationPhase: CreateSWUProposalPhaseBody;
  references: CreateSWUProposalReferenceBody[];
  attachments: Id[];
  teamQuestionResponses: CreateSWUProposalTeamQuestionResponseBody[];
  status: CreateSWUProposalStatus;
}

export interface CreateSWUProposalPhaseValidationErrors {
  members?: CreateSWUProposalTeamMemberValidationErrors[];
  proposedCost?: string[];
  phase?: string[];
}

export interface CreateSWUProposalTeamMemberValidationErrors extends ErrorTypeFrom<CreateSWUProposalTeamMemberBody> {
  parseFailure?: string[];
  members?: string[];
}

export interface CreateSWUProposalReferenceValidationErrors extends ErrorTypeFrom<CreateSWUProposalReferenceBody> {
  parseFailure?: string[];
}

export interface CreateSWUProposalTeamQuestionResponseValidationErrors extends ErrorTypeFrom<CreateSWUProposalTeamQuestionResponseBody> {
  parseFailure?: string[];
}

export interface CreateValidationErrors extends BodyWithErrors {
  attachments?: string[][];
  inceptionPhase?: CreateSWUProposalPhaseValidationErrors;
  prototypePhase?: CreateSWUProposalPhaseValidationErrors;
  implementationPhase?: CreateSWUProposalPhaseValidationErrors;
  references?: CreateSWUProposalReferenceValidationErrors[];
  teamQuestionResponses?: CreateSWUProposalTeamQuestionResponseValidationErrors[];
  organization?: string[];
  opportunity?: string[];
  status?: string[];
  totalProposedCost?: string[];
  team?: string[];
}

// Update.

export type UpdateRequestBody
  = ADT<'edit', UpdateEditRequestBody>
  | ADT<'submit', string>
  | ADT<'scoreQuestions', number>
  | ADT<'scoreCodeChallenge', number>
  | ADT<'scoreTeamScenario', number>
  | ADT<'award', string>
  | ADT<'disqualify', string>
  | ADT<'withdraw', string>;

export type UpdateEditRequestBody = Omit<CreateRequestBody, 'opportunity' | 'status'>;

type UpdateADTErrors
  = ADT<'edit', UpdateEditValidationErrors>
  | ADT<'submit', string[]>
  | ADT<'scoreQuestions', string[]>
  | ADT<'scoreCodeChallenge', string[]>
  | ADT<'scoreTeamScenario', string[]>
  | ADT<'award', string[]>
  | ADT<'disqualify', string[]>
  | ADT<'withdraw', string[]>
  | ADT<'parseFailure'>;

export interface UpdateEditValidationErrors {
  attachments?: string[][];
  inceptionPhase?: CreateSWUProposalPhaseValidationErrors;
  prototypePhase?: CreateSWUProposalPhaseValidationErrors;
  implementationPhase?: CreateSWUProposalPhaseValidationErrors;
  references: CreateSWUProposalReferenceValidationErrors[];
}

export interface UpdateValidationErrors extends BodyWithErrors {
  proposal?: UpdateADTErrors;
}

// Delete.

export interface DeleteValidationErrors extends BodyWithErrors {
  status?: string[];
}

export function isSWUProposalStatusVisibleToGovernment(s: SWUProposalStatus): boolean {
  switch (s) {
    case SWUProposalStatus.Draft:
    case SWUProposalStatus.Submitted:
      return false;
    default:
      return true;
  }
}

export const rankableSWUProposalStatuses: readonly SWUProposalStatus[] = [SWUProposalStatus.Evaluated, SWUProposalStatus.Awarded, SWUProposalStatus.NotAwarded];
