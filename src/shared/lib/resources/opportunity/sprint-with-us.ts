import { Addendum } from 'shared/lib/resources/addendum';
import { FileRecord } from 'shared/lib/resources/file';
import { UserSlim } from 'shared/lib/resources/user';
import { ADT, BodyWithErrors, Id } from 'shared/lib/types';
import { ErrorTypeFrom } from 'shared/lib/validation';

export const DEFAULT_OPPORTUNITY_TITLE = 'Untitled';

export enum SWUOpportunityStatus {
  Draft = 'DRAFT',
  Published = 'PUBLISHED',
  EvaluationTeamQuestions = 'EVAL_QUESTIONS',
  EvaluationCodeChallenge = 'EVAL_CC',
  EvaluationTeamScenario = 'EVAL_SCENARIO',
  Awarded = 'AWARDED',
  Suspended = 'SUSPENDED',
  Canceled = 'CANCELED'
}

export enum SWUOpportunityEvent {
  Edited = 'EDITED',
  AddendumAdded = 'ADDENDUM_ADDED'
}

export enum SWUOpportunityPhaseType {
  Inception = 'INCEPTION',
  Prototype = 'PROTOTYPE',
  Implementation = 'IMPLEMENTATION'
}

export interface SWUOpportunityHistoryRecord {
  id: Id;
  createdAt: Date;
  createdBy: UserSlim | null;
  type: ADT<'status', SWUOpportunityStatus> | ADT<'event', SWUOpportunityEvent>;
  note: string;
}

export function parseSWUOpportunityStatus(raw: string): SWUOpportunityStatus | null {
  switch (raw) {
    case SWUOpportunityStatus.Draft: return SWUOpportunityStatus.Draft;
    case SWUOpportunityStatus.Published: return SWUOpportunityStatus.Published;
    case SWUOpportunityStatus.EvaluationTeamQuestions: return SWUOpportunityStatus.EvaluationTeamQuestions;
    case SWUOpportunityStatus.EvaluationCodeChallenge: return SWUOpportunityStatus.EvaluationCodeChallenge;
    case SWUOpportunityStatus.EvaluationTeamScenario: return SWUOpportunityStatus.EvaluationTeamScenario;
    case SWUOpportunityStatus.Awarded: return SWUOpportunityStatus.Awarded;
    case SWUOpportunityStatus.Suspended: return SWUOpportunityStatus.Suspended;
    case SWUOpportunityStatus.Canceled: return SWUOpportunityStatus.Canceled;
    default: return null;
  }
}

export interface SWUOpportunity {
  id: Id;
  createdAt: Date;
  updatedAt: Date;

  createdBy: UserSlim;
  updatedBy: UserSlim;

  // TODO:
  successfulProponent?: true;

  title: string;
  teaser: string;
  remoteOk: boolean;
  remoteDesc: string;
  location: string;
  totalMaxBudget: number;
  minTeamMembers: number;
  mandatorySkills: string[];
  optionalSkills: string[];
  description: string;
  proposalDeadline: Date;
  assignmentDeadline: Date;
  questionsWeight: number;
  codeChallengeWeight: number;
  scenarioWeight: number;
  priceWeight: number;
  status: SWUOpportunityStatus;
  attachments: FileRecord[];
  addenda: Addendum[];
  phases: SWUOpportunityPhase[];
  teamQuestions: SWUTeamQuestion[];
  history?: SWUOpportunityHistoryRecord[];
  publishedAt: Date;
  subscribed?: boolean;

  // TODO:
  reporting?: {
    numProposals: number;
    numWatchers: number;
    numViews: number;
  };
}

export interface SWUOpportunityPhase {
  type: SWUOpportunityPhaseType;
  startDate: Date;
  completionDate: Date;
  maxBudget: number;
  createdAt: Date;
  createdBy: UserSlim;
  updatedAt: Date;
  updatedBy: UserSlim;
  requiredCapabilities: string[];
}

export interface SWUTeamQuestion {
  question: string;
  guideline: string;
  score: number;
  wordLimit: number;
  order: number;
  createdAt: Date;
  createdBy: UserSlim;
  updatedAt: Date;
  updatedBy: UserSlim;
}

export type SWUOpportunitySlim = Pick<SWUOpportunity, 'id' | 'title' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'status' | 'proposalDeadline'>;

export type CreateSWUOpportunityStatus
  = SWUOpportunityStatus.Published
  | SWUOpportunityStatus.Draft;

export interface CreateRequestBody {
  title: string;
  teaser: string;
  remoteOk: boolean;
  remoteDesc: string;
  location: string;
  totalMaxBudget: number;
  mandatorySkills: string[];
  optionalSkills: string[];
  description: string;
  proposalDeadline: string;
  assignmentDate: string;
  questionsWeight: number;
  codeChallengeWeight: number;
  scenarioWeight: number;
  priceWeight: number;
  attachments: Id[];
  status: CreateSWUOpportunityStatus;
  phases: SWUOpportunityPhase[];
  teamQuestions: SWUTeamQuestion[];
}

export interface CreateValidationErrors extends Omit<ErrorTypeFrom<CreateRequestBody> & BodyWithErrors, 'mandatorySkills' | 'optionalSkills' | 'phases' | 'teamQuestions' | 'attachments'> {
  mandatorySkills?: string[][];
  optionalSkills?: string[][];
  phases?: string[][];
  teamQuestions?: string[][];
  attachments?: string[][];
}

export type UpdateRequestBody
  = ADT<'edit', UpdateEditRequestBody>
  | ADT<'publish', string>
  | ADT<'evaluateQuestions', string>
  | ADT<'evaluateCodeChallenge', string>
  | ADT<'evaluateTeamScenario', string>
  | ADT<'suspend', string>
  | ADT<'cancel', string>
  | ADT<'addAddendum', string>;

export type UpdateEditRequestBody = Omit<CreateRequestBody, 'status'>;

type UpdateADTErrors
  = ADT<'edit', UpdateEditValidationErrors>
  | ADT<'publish', string[]>
  | ADT<'evaluateQuestions', string[]>
  | ADT<'evaluateCodeChallenge', string[]>
  | ADT<'evaluateTeamScenario', string[]>
  | ADT<'suspend', string[]>
  | ADT<'cancel', string[]>
  | ADT<'addAddendum', string[]>
  | ADT<'parseFailure'>;

export interface UpdateEditValidationErrors extends BodyWithErrors {
  opportunity?: UpdateADTErrors;
}

export interface UpdateEditValidationErrors extends Omit<ErrorTypeFrom<UpdateEditRequestBody>, 'mandatorySkills' | 'optionalSkills' | 'phases' | 'teamQuestions' | 'attachments'> {
  mandatorySkills?: string[][];
  optionalSkills?: string[][];
  phases?: string[][];
  teamQuestions?: string[][];
  attachments?: string[][];
}

export type DeleteValidationErrors = BodyWithErrors;
