import { Addendum } from 'shared/lib/resources/addendum';
import { FileRecord } from 'shared/lib/resources/file';
import { UserSlim } from 'shared/lib/resources/user';
import { ADT, BodyWithErrors, Id } from 'shared/lib/types';
import { ErrorTypeFrom } from 'shared/lib/validation';

export const DEFAULT_OPPORTUNITY_TITLE = 'Untitled';

export enum SWUOpportunityPhaseType {
  Inception = 'INCEPTION',
  Prototype = 'PROTOTYPE',
  Implementation = 'IMPLEMENTATION'
}

export enum SWUOpportunityStatus {
  Draft = 'DRAFT',
  UnderReview = 'UNDER_REVIEW',
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
    case SWUOpportunityStatus.UnderReview: return SWUOpportunityStatus.UnderReview;
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

export const publicOpportunityStatuses: readonly SWUOpportunityStatus[] = [SWUOpportunityStatus.Published, SWUOpportunityStatus.EvaluationTeamQuestions, SWUOpportunityStatus.EvaluationCodeChallenge, SWUOpportunityStatus.EvaluationTeamScenario, SWUOpportunityStatus.Awarded];

export const privateOpportunityStatuses: readonly SWUOpportunityStatus[] = [SWUOpportunityStatus.Draft, SWUOpportunityStatus.UnderReview, SWUOpportunityStatus.Canceled, SWUOpportunityStatus.Suspended];

export const editableOpportunityStatuses: readonly SWUOpportunityStatus[] = [SWUOpportunityStatus.Draft, SWUOpportunityStatus.UnderReview, SWUOpportunityStatus.Published, SWUOpportunityStatus.Suspended];

export interface SWUOpportunity {
  id: Id;
  createdAt: Date;
  updatedAt: Date;

  createdBy?: UserSlim;
  updatedBy?: UserSlim;

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
  assignmentDate: Date;
  questionsWeight: number;
  codeChallengeWeight: number;
  scenarioWeight: number;
  priceWeight: number;
  status: SWUOpportunityStatus;
  attachments: FileRecord[];
  addenda: Addendum[];
  inceptionPhase?: SWUOpportunityPhase;
  prototypePhase?: SWUOpportunityPhase;
  implementationPhase: SWUOpportunityPhase;
  teamQuestions: SWUTeamQuestion[];
  history?: SWUOpportunityHistoryRecord[];
  publishedAt?: Date;
  subscribed?: boolean;

  // TODO:
  reporting?: {
    numProposals: number;
    numWatchers: number;
    numViews: number;
  };
}

export interface SWUOpportunityPhaseRequiredCapability {
  capability: string;
  fullTime: boolean;
  createdAt: Date;
  createdBy?: UserSlim;
}

export interface SWUOpportunityPhase {
  phase: SWUOpportunityPhaseType;
  startDate: Date;
  completionDate: Date;
  maxBudget: number;
  createdAt: Date;
  createdBy?: UserSlim;
  requiredCapabilities: SWUOpportunityPhaseRequiredCapability[];
}

export interface SWUTeamQuestion {
  question: string;
  guideline: string;
  score: number;
  wordLimit: number;
  order: number;
  createdAt: Date;
  createdBy?: UserSlim;
}

export type SWUOpportunitySlim = Pick<SWUOpportunity, 'id' | 'title' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'status' | 'proposalDeadline'>;

export interface SWUOpportunityHistoryRecord {
  id: Id;
  createdAt: Date;
  createdBy: UserSlim | null;
  type: ADT<'status', SWUOpportunityStatus> | ADT<'event', SWUOpportunityEvent>;
  note: string;
}

// Create.

export type CreateSWUOpportunityStatus
  = SWUOpportunityStatus.Published
  | SWUOpportunityStatus.UnderReview
  | SWUOpportunityStatus.Draft;

export type CreateSWUOpportunityPhaseRequiredCapabilityBody = Pick<SWUOpportunityPhaseRequiredCapability, 'capability' | 'fullTime'>;

export interface CreateSWUOpportunityPhaseBody extends Omit<SWUOpportunityPhase, 'createdAt' | 'createdBy' | 'startDate' | 'completionDate' | 'requiredCapabilities' | 'phase'> {
  startDate: string;
  completionDate: string;
  requiredCapabilities: CreateSWUOpportunityPhaseRequiredCapabilityBody[];
}

export type CreateSWUTeamQuestionBody = Omit<SWUTeamQuestion, 'createdAt' | 'createdBy'>;

export interface CreateRequestBody {
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
  proposalDeadline: string;
  assignmentDate: string;
  questionsWeight: number;
  codeChallengeWeight: number;
  scenarioWeight: number;
  priceWeight: number;
  attachments: Id[];
  status: CreateSWUOpportunityStatus;
  inceptionPhase?: CreateSWUOpportunityPhaseBody;
  prototypePhase?: CreateSWUOpportunityPhaseBody;
  implementationPhase: CreateSWUOpportunityPhaseBody;
  teamQuestions: CreateSWUTeamQuestionBody[];
}

export interface CreateSWUOpportunityPhaseValidationErrors extends Omit<ErrorTypeFrom<CreateSWUOpportunityPhaseBody>, 'requiredCapabilities'> {
  requiredCapabilities?: CreateSWUOpportunityPhaseRequiredCapabilityErrors[];
}

export interface CreateSWUOpportunityPhaseRequiredCapabilityErrors {
  capability?: string[];
  fullTime?: string[];
  parseFailure?: string[];
}

export interface CreateSWUTeamQuestionValidationErrors extends ErrorTypeFrom<CreateSWUTeamQuestionBody> {
  parseFailure?: string[];
}

export interface CreateValidationErrors extends Omit<ErrorTypeFrom<CreateRequestBody> & BodyWithErrors, 'mandatorySkills' | 'optionalSkills' | 'inceptionPhase' | 'prototypePhase' | 'implementationPhase' | 'teamQuestions' | 'attachments'> {
  mandatorySkills?: string[][];
  optionalSkills?: string[][];
  inceptionPhase?: CreateSWUOpportunityPhaseValidationErrors;
  prototypePhase?: CreateSWUOpportunityPhaseValidationErrors;
  implementationPhase?: CreateSWUOpportunityPhaseValidationErrors;
  teamQuestions?: CreateSWUTeamQuestionValidationErrors[];
  attachments?: string[][];
  scoreWeights?: string[];
  phases?: string[];
}

// Update.

export type UpdateRequestBody
  = ADT<'edit', UpdateEditRequestBody>
  | ADT<'submitForReview', string>
  | ADT<'publish', string>
  | ADT<'evaluateCodeChallenge', string>
  | ADT<'evaluateTeamScenario', string>
  | ADT<'suspend', string>
  | ADT<'cancel', string>
  | ADT<'addAddendum', string>;

export type UpdateEditRequestBody = Omit<CreateRequestBody, 'status'>;

type UpdateADTErrors
  = ADT<'edit', UpdateEditValidationErrors>
  | ADT<'submitForReview', string[]>
  | ADT<'publish', string[]>
  | ADT<'evaluateCodeChallenge', string[]>
  | ADT<'evaluateTeamScenario', string[]>
  | ADT<'suspend', string[]>
  | ADT<'cancel', string[]>
  | ADT<'addAddendum', string[]>
  | ADT<'parseFailure'>;

export interface UpdateValidationErrors extends BodyWithErrors {
  opportunity?: UpdateADTErrors;
}

export interface UpdateEditValidationErrors extends Omit<ErrorTypeFrom<UpdateEditRequestBody>, 'mandatorySkills' | 'optionalSkills' | 'inceptionPhase' | 'prototypePhase' | 'implementationPhase' | 'teamQuestions' | 'attachments'> {
  mandatorySkills?: string[][];
  optionalSkills?: string[][];
  inceptionPhase?: CreateSWUOpportunityPhaseValidationErrors;
  prototypePhase?: CreateSWUOpportunityPhaseValidationErrors;
  implementationPhase?: CreateSWUOpportunityPhaseValidationErrors;
  teamQuestions?: CreateSWUTeamQuestionValidationErrors[];
  attachments?: string[][];
  scoreWeights?: string[];
  phases?: string[];
}

// Delete.

export interface DeleteValidationErrors extends BodyWithErrors {
  status?: string[];
}

export function isValidStatusChange(from: SWUOpportunityStatus, to: SWUOpportunityStatus): boolean {
  switch (from) {
    case SWUOpportunityStatus.Draft:
      return [SWUOpportunityStatus.UnderReview, SWUOpportunityStatus.Published].includes(to);
    case SWUOpportunityStatus.UnderReview:
      return [SWUOpportunityStatus.Published, SWUOpportunityStatus.Suspended].includes(to);
    case SWUOpportunityStatus.Published:
      return [SWUOpportunityStatus.Canceled, SWUOpportunityStatus.Suspended, SWUOpportunityStatus.EvaluationTeamQuestions].includes(to);
    case SWUOpportunityStatus.EvaluationTeamQuestions:
      return [SWUOpportunityStatus.Canceled, SWUOpportunityStatus.Suspended, SWUOpportunityStatus.EvaluationCodeChallenge].includes(to);
    case SWUOpportunityStatus.EvaluationCodeChallenge:
      return [SWUOpportunityStatus.Canceled, SWUOpportunityStatus.Suspended, SWUOpportunityStatus.EvaluationTeamScenario].includes(to);
    case SWUOpportunityStatus.EvaluationTeamScenario:
      return [SWUOpportunityStatus.Canceled, SWUOpportunityStatus.Suspended, SWUOpportunityStatus.Awarded].includes(to);
    case SWUOpportunityStatus.Suspended:
      return [SWUOpportunityStatus.Published, SWUOpportunityStatus.Canceled].includes(to);
    default:
      return false;
  }
}

export function doesSWUOpportunityStatusAllowGovToViewProposals(s: SWUOpportunityStatus): boolean {
  switch (s) {
    case SWUOpportunityStatus.Draft:
    case SWUOpportunityStatus.UnderReview:
    case SWUOpportunityStatus.Published:
      return false;
    default:
      return true;
  }
}
