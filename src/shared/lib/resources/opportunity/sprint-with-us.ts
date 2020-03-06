import { Addendum } from 'shared/lib/resources/addendum';
import { FileRecord } from 'shared/lib/resources/file';
import { UserSlim } from 'shared/lib/resources/user';
import { ADT, Id } from 'shared/lib/types';

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

enum SWUOpportunityPhaseType {
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
