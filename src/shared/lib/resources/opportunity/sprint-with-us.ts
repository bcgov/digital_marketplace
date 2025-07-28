import { SWU_MAX_BUDGET } from "shared/config";
import { formatAmount, isDateInTheFuture, isDateInThePast } from "shared/lib";
import { Addendum } from "shared/lib/resources/addendum";
import { FileRecord } from "shared/lib/resources/file";
import { User, UserSlim } from "shared/lib/resources/user";
import { ADT, BodyWithErrors, Id } from "shared/lib/types";
import { ErrorTypeFrom } from "shared/lib/validation";

export type { Addendum } from "shared/lib/resources/addendum";

export const DEFAULT_OPPORTUNITY_TITLE = "Untitled";
export const DEFAULT_QUESTIONS_WEIGHT = 25;
export const DEFAULT_CODE_CHALLENGE_WEIGHT = 25;
export const DEFAULT_SCENARIO_WEIGHT = 40;
export const DEFAULT_PRICE_WEIGHT = 10;
export const MAX_TEAM_QUESTIONS = 100;
export const MAX_TEAM_QUESTION_WORD_LIMIT = 3000;
export const DEFAULT_TEAM_QUESTION_RESPONSE_WORD_LIMIT = 300;
export const DEFAULT_TEAM_QUESTION_AVAILABLE_SCORE = 5;
export const FORMATTED_MAX_BUDGET = formatAmount(SWU_MAX_BUDGET, "$");

export enum SWUOpportunityPhaseType {
  Inception = "INCEPTION",
  Prototype = "PROTOTYPE",
  Implementation = "IMPLEMENTATION"
}

export function parseSWUOpportunityPhaseType(
  raw: string
): SWUOpportunityPhaseType | null {
  switch (raw) {
    case SWUOpportunityPhaseType.Inception:
      return SWUOpportunityPhaseType.Inception;
    case SWUOpportunityPhaseType.Prototype:
      return SWUOpportunityPhaseType.Prototype;
    case SWUOpportunityPhaseType.Implementation:
      return SWUOpportunityPhaseType.Implementation;
    default:
      return null;
  }
}

export function swuOpportunityPhaseTypeToTitleCase(
  phase: SWUOpportunityPhaseType
): string {
  switch (phase) {
    case SWUOpportunityPhaseType.Inception:
      return "Inception";
    case SWUOpportunityPhaseType.Prototype:
      return "Proof of Concept";
    case SWUOpportunityPhaseType.Implementation:
      return "Implementation";
  }
}

export enum SWUOpportunityStatus {
  Draft = "DRAFT",
  UnderReview = "UNDER_REVIEW",
  Published = "PUBLISHED",
  EvaluationTeamQuestionsIndividual = "EVAL_QUESTIONS_INDIVIDUAL",
  EvaluationTeamQuestionsConsensus = "EVAL_QUESTIONS_CONSENSUS",
  EvaluationCodeChallenge = "EVAL_CC",
  EvaluationTeamScenario = "EVAL_SCENARIO",
  Processing = "PROCESSING",
  Awarded = "AWARDED",
  Suspended = "SUSPENDED",
  Canceled = "CANCELED"
}

export enum SWUOpportunityEvent {
  Edited = "EDITED",
  AddendumAdded = "ADDENDUM_ADDED",
  NoteAdded = "NOTE_ADDED"
}

export interface SWUOpportunityHistoryRecord {
  id: Id;
  createdAt: Date;
  createdBy: UserSlim | null;
  type: ADT<"status", SWUOpportunityStatus> | ADT<"event", SWUOpportunityEvent>;
  note: string;
  attachments: FileRecord[];
}

export function parseSWUOpportunityStatus(
  raw: string
): SWUOpportunityStatus | null {
  switch (raw) {
    case SWUOpportunityStatus.Draft:
      return SWUOpportunityStatus.Draft;
    case SWUOpportunityStatus.UnderReview:
      return SWUOpportunityStatus.UnderReview;
    case SWUOpportunityStatus.Published:
      return SWUOpportunityStatus.Published;
    case SWUOpportunityStatus.EvaluationTeamQuestionsIndividual:
      return SWUOpportunityStatus.EvaluationTeamQuestionsIndividual;
    case SWUOpportunityStatus.EvaluationTeamQuestionsConsensus:
      return SWUOpportunityStatus.EvaluationTeamQuestionsConsensus;
    case SWUOpportunityStatus.EvaluationCodeChallenge:
      return SWUOpportunityStatus.EvaluationCodeChallenge;
    case SWUOpportunityStatus.EvaluationTeamScenario:
      return SWUOpportunityStatus.EvaluationTeamScenario;
    case SWUOpportunityStatus.Processing:
      return SWUOpportunityStatus.Processing;
    case SWUOpportunityStatus.Awarded:
      return SWUOpportunityStatus.Awarded;
    case SWUOpportunityStatus.Suspended:
      return SWUOpportunityStatus.Suspended;
    case SWUOpportunityStatus.Canceled:
      return SWUOpportunityStatus.Canceled;
    default:
      return null;
  }
}

export function isSWUOpportunityStatusInEvaluation(
  s: SWUOpportunityStatus
): boolean {
  switch (s) {
    case SWUOpportunityStatus.EvaluationTeamQuestionsIndividual:
    case SWUOpportunityStatus.EvaluationTeamQuestionsConsensus:
    case SWUOpportunityStatus.EvaluationCodeChallenge:
    case SWUOpportunityStatus.EvaluationTeamScenario:
      return true;
    default:
      return false;
  }
}

export const publicOpportunityStatuses: readonly SWUOpportunityStatus[] = [
  SWUOpportunityStatus.Published,
  SWUOpportunityStatus.EvaluationTeamQuestionsIndividual,
  SWUOpportunityStatus.EvaluationTeamQuestionsConsensus,
  SWUOpportunityStatus.EvaluationCodeChallenge,
  SWUOpportunityStatus.EvaluationTeamScenario,
  SWUOpportunityStatus.Processing,
  SWUOpportunityStatus.Awarded,
  SWUOpportunityStatus.Canceled
];

export const privateOpportunityStatuses: readonly SWUOpportunityStatus[] = [
  SWUOpportunityStatus.Draft,
  SWUOpportunityStatus.UnderReview,
  SWUOpportunityStatus.Suspended
];

export function isSWUOpportunityAcceptingProposals(
  o: Pick<SWUOpportunity, "status" | "proposalDeadline">
): boolean {
  return (
    o.status === SWUOpportunityStatus.Published &&
    isDateInTheFuture(o.proposalDeadline)
  );
}

export function isUnpublished(o: Pick<SWUOpportunity, "status">): boolean {
  return (
    o.status === SWUOpportunityStatus.Draft ||
    o.status === SWUOpportunityStatus.UnderReview ||
    o.status === SWUOpportunityStatus.Suspended
  );
}

export function isOpen(
  o: Pick<SWUOpportunity, "status" | "proposalDeadline">
): boolean {
  return isSWUOpportunityAcceptingProposals(o);
}

export function isClosed(
  o: Pick<SWUOpportunity, "status" | "proposalDeadline">
): boolean {
  return !isOpen(o) && !isUnpublished(o);
}

export const editableOpportunityStatuses: readonly SWUOpportunityStatus[] = [
  SWUOpportunityStatus.Draft,
  SWUOpportunityStatus.UnderReview,
  SWUOpportunityStatus.Published,
  SWUOpportunityStatus.Suspended
];

export interface SWUOpportunity {
  id: Id;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: UserSlim;
  updatedBy?: UserSlim;
  successfulProponent?: SWUSuccessfulProponent;
  title: string;
  teaser: string;
  remoteOk: boolean;
  remoteDesc: string;
  location: string;
  totalMaxBudget: number;
  minTeamMembers?: number | null;
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
  reporting?: {
    numProposals: number;
    numWatchers: number;
    numViews: number;
  };
  evaluationPanel?: SWUEvaluationPanelMember[];
}

export interface SWUSuccessfulProponent {
  id: Id; // Organization ID
  name: string; // Organization Legal Name
  email?: string; // Organization Contact Email
  totalScore?: number;
  createdBy?: UserSlim;
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
  minimumScore?: number | null;
}

export interface SWUEvaluationPanelMember {
  user: UserSlim & { email: User["email"] };
  chair: boolean;
  evaluator: boolean;
  order: number;
}

export function getQuestionByOrder(
  opp: SWUOpportunity,
  order: number
): SWUTeamQuestion | null {
  for (const q of opp.teamQuestions) {
    if (q.order === order) {
      return q;
    }
  }
  return null;
}

export type SWUOpportunitySlim = Pick<
  SWUOpportunity,
  | "id"
  | "title"
  | "teaser"
  | "createdAt"
  | "createdBy"
  | "updatedAt"
  | "updatedBy"
  | "status"
  | "proposalDeadline"
  | "totalMaxBudget"
  | "location"
  | "remoteOk"
  | "subscribed"
>;

// Create.

export type CreateSWUOpportunityStatus =
  | SWUOpportunityStatus.Published
  | SWUOpportunityStatus.UnderReview
  | SWUOpportunityStatus.Draft;

export type CreateSWUOpportunityPhaseRequiredCapabilityBody = Pick<
  SWUOpportunityPhaseRequiredCapability,
  "capability" | "fullTime"
>;

export interface CreateSWUOpportunityPhaseBody
  extends Pick<SWUOpportunityPhase, "maxBudget"> {
  startDate: string;
  completionDate: string;
  requiredCapabilities: CreateSWUOpportunityPhaseRequiredCapabilityBody[];
}

export type CreateSWUTeamQuestionBody = Omit<
  SWUTeamQuestion,
  "createdAt" | "createdBy"
>;

export type CreateSWUEvaluationPanelMemberBody = {
  user: Id;
  chair: boolean;
  evaluator: boolean;
  order: number;
};

export interface CreateRequestBody {
  title: string;
  teaser: string;
  remoteOk: boolean;
  remoteDesc: string;
  location: string;
  proposalDeadline: string;
  assignmentDate: string;
  totalMaxBudget: number;
  minTeamMembers?: number | null;
  mandatorySkills: string[];
  optionalSkills: string[];
  description: string;
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
  evaluationPanel: CreateSWUEvaluationPanelMemberBody[];
}

export interface CreateSWUOpportunityPhaseValidationErrors
  extends Omit<
    ErrorTypeFrom<CreateSWUOpportunityPhaseBody>,
    "requiredCapabilities"
  > {
  requiredCapabilities?: CreateSWUOpportunityPhaseRequiredCapabilityErrors[];
}

export interface CreateSWUOpportunityPhaseRequiredCapabilityErrors {
  capability?: string[];
  fullTime?: string[];
  parseFailure?: string[];
}

export interface CreateSWUTeamQuestionValidationErrors
  extends ErrorTypeFrom<CreateSWUTeamQuestionBody> {
  parseFailure?: string[];
}

export interface CreateSWUEvaluationPanelMemberValidationErrors
  extends ErrorTypeFrom<CreateSWUEvaluationPanelMemberBody> {
  parseFailure?: string[];
  members?: string[];
}

export interface CreateValidationErrors
  extends Omit<
    ErrorTypeFrom<CreateRequestBody> & BodyWithErrors,
    | "mandatorySkills"
    | "optionalSkills"
    | "inceptionPhase"
    | "prototypePhase"
    | "implementationPhase"
    | "teamQuestions"
    | "attachments"
    | "evaluationPanel"
  > {
  mandatorySkills?: string[][];
  optionalSkills?: string[][];
  inceptionPhase?: CreateSWUOpportunityPhaseValidationErrors;
  prototypePhase?: CreateSWUOpportunityPhaseValidationErrors;
  implementationPhase?: CreateSWUOpportunityPhaseValidationErrors;
  teamQuestions?: CreateSWUTeamQuestionValidationErrors[];
  attachments?: string[][];
  scoreWeights?: string[];
  phases?: string[];
  evaluationPanel?: CreateSWUEvaluationPanelMemberValidationErrors[];
}

// Update.

export type UpdateRequestBody =
  | ADT<"edit", UpdateEditRequestBody>
  | ADT<"submitForReview", string>
  | ADT<"publish", string>
  | ADT<"startCodeChallenge", string>
  | ADT<"startTeamScenario", string>
  | ADT<"suspend", string>
  | ADT<"cancel", string>
  | ADT<"addAddendum", string>
  | ADT<"addNote", UpdateWithNoteRequestBody>
  | ADT<
      "submitIndividualQuestionEvaluations",
      SubmitQuestionEvaluationsWithNoteRequestBody
    >
  | ADT<
      "submitConsensusQuestionEvaluations",
      SubmitQuestionEvaluationsWithNoteRequestBody
    >
  | ADT<"editEvaluationPanel", CreateSWUEvaluationPanelMemberBody[]>
  | ADT<"finalizeQuestionConsensuses", string>;

export type UpdateEditRequestBody = Omit<CreateRequestBody, "status">;

export interface UpdateWithNoteRequestBody {
  note: string;
  attachments: Id[];
}

export interface UpdateWithNoteValidationErrors
  extends Omit<ErrorTypeFrom<UpdateWithNoteRequestBody>, "attachments"> {
  attachments?: string[][];
}

export interface SubmitQuestionEvaluationsWithNoteRequestBody {
  note: string;
  proposals: Id[];
}

type UpdateADTErrors =
  | ADT<"edit", UpdateEditValidationErrors>
  | ADT<"submitForReview", string[]>
  | ADT<"publish", string[]>
  | ADT<"startCodeChallenge", string[]>
  | ADT<"startTeamScenario", string[]>
  | ADT<"suspend", string[]>
  | ADT<"cancel", string[]>
  | ADT<"addAddendum", string[]>
  | ADT<"addNote", UpdateWithNoteValidationErrors>
  | ADT<"submitIndividualQuestionEvaluations", string[]>
  | ADT<"submitConsensusQuestionEvaluations", string[]>
  | ADT<"editEvaluationPanel", UpdateEditValidationErrors>
  | ADT<"finalizeQuestionConsensuses", string[]>
  | ADT<"parseFailure">;

export interface UpdateValidationErrors extends BodyWithErrors {
  opportunity?: UpdateADTErrors;
}

export interface UpdateEditValidationErrors
  extends Omit<
    ErrorTypeFrom<UpdateEditRequestBody>,
    | "mandatorySkills"
    | "optionalSkills"
    | "inceptionPhase"
    | "prototypePhase"
    | "implementationPhase"
    | "teamQuestions"
    | "attachments"
    | "evaluationPanel"
  > {
  mandatorySkills?: string[][];
  optionalSkills?: string[][];
  inceptionPhase?: CreateSWUOpportunityPhaseValidationErrors;
  prototypePhase?: CreateSWUOpportunityPhaseValidationErrors;
  implementationPhase?: CreateSWUOpportunityPhaseValidationErrors;
  teamQuestions?: CreateSWUTeamQuestionValidationErrors[];
  attachments?: string[][];
  scoreWeights?: string[];
  phases?: string[];
  evaluationPanel?: CreateSWUEvaluationPanelMemberValidationErrors[];
}

// Delete.

export interface DeleteValidationErrors extends BodyWithErrors {
  status?: string[];
}

export function isValidStatusChange(
  from: SWUOpportunityStatus,
  to: SWUOpportunityStatus
): boolean {
  switch (from) {
    case SWUOpportunityStatus.Draft:
      return [
        SWUOpportunityStatus.UnderReview,
        SWUOpportunityStatus.Published
      ].includes(to);
    case SWUOpportunityStatus.UnderReview:
      return [
        SWUOpportunityStatus.Published,
        SWUOpportunityStatus.Suspended
      ].includes(to);
    case SWUOpportunityStatus.Published:
      return [
        SWUOpportunityStatus.Canceled,
        SWUOpportunityStatus.Suspended,
        SWUOpportunityStatus.EvaluationTeamQuestionsIndividual
      ].includes(to);
    case SWUOpportunityStatus.EvaluationTeamQuestionsIndividual:
      return [
        SWUOpportunityStatus.Canceled,
        SWUOpportunityStatus.Suspended,
        SWUOpportunityStatus.EvaluationTeamQuestionsConsensus
      ].includes(to);
    case SWUOpportunityStatus.EvaluationTeamQuestionsConsensus:
      return [
        SWUOpportunityStatus.Canceled,
        SWUOpportunityStatus.Suspended,
        SWUOpportunityStatus.EvaluationCodeChallenge
      ].includes(to);
    case SWUOpportunityStatus.EvaluationCodeChallenge:
      return [
        SWUOpportunityStatus.Canceled,
        SWUOpportunityStatus.Suspended,
        SWUOpportunityStatus.EvaluationTeamScenario
      ].includes(to);
    case SWUOpportunityStatus.EvaluationTeamScenario:
      return [
        SWUOpportunityStatus.Canceled,
        SWUOpportunityStatus.Suspended,
        SWUOpportunityStatus.Processing
      ].includes(to);
    case SWUOpportunityStatus.Processing:
      return [
        SWUOpportunityStatus.Canceled,
        SWUOpportunityStatus.Suspended,
        SWUOpportunityStatus.Awarded
      ].includes(to);
    case SWUOpportunityStatus.Suspended:
      return [
        SWUOpportunityStatus.Published,
        SWUOpportunityStatus.Canceled
      ].includes(to);
    default:
      return false;
  }
}

export function canSWUOpportunityBeScreenedInToTeamScenario(
  o: SWUOpportunity
): boolean {
  switch (o.status) {
    case SWUOpportunityStatus.EvaluationCodeChallenge:
      return true;
    default:
      return false;
  }
}

export function canSWUOpportunityBeAwarded(o: SWUOpportunity): boolean {
  switch (o.status) {
    case SWUOpportunityStatus.Processing:
    case SWUOpportunityStatus.Awarded:
      return true;
    default:
      return false;
  }
}

export function canViewSWUOpportunityProposals(o: SWUOpportunity): boolean {
  // Return true if the opportunity has ever had the `Evaluation` status.
  return (
    !!o.history &&
    o.history.reduce((acc, record) => {
      return (
        acc ||
        (record.type.tag === "status" &&
          isSWUOpportunityStatusInEvaluation(record.type.value))
      );
    }, false as boolean)
  );
}

export function canViewSWUOpportunityTeamQuestionResponseEvaluations(
  o: SWUOpportunity,
  status: SWUOpportunityStatus
): boolean {
  // Return true if the opportunity has ever had the status.
  return (
    !!o.history &&
    o.history.reduce((acc, record) => {
      return (
        acc || (record.type.tag === "status" && record.type.value === status)
      );
    }, false as boolean)
  );
}

export function canSWUOpportunityDetailsBeEdited(
  o: SWUOpportunity,
  adminsOnly: boolean
): boolean {
  switch (o.status) {
    case SWUOpportunityStatus.Draft:
    case SWUOpportunityStatus.UnderReview:
      return true;
    case SWUOpportunityStatus.Published:
    case SWUOpportunityStatus.Suspended:
      return adminsOnly;
    default:
      return false;
  }
}

export function isSWUOpportunityPublic(o: SWUOpportunity): boolean {
  switch (o.status) {
    case SWUOpportunityStatus.Published:
    case SWUOpportunityStatus.EvaluationTeamQuestionsIndividual:
    case SWUOpportunityStatus.EvaluationTeamQuestionsConsensus:
    case SWUOpportunityStatus.EvaluationCodeChallenge:
    case SWUOpportunityStatus.EvaluationTeamScenario:
    case SWUOpportunityStatus.Processing:
    case SWUOpportunityStatus.Awarded:
    case SWUOpportunityStatus.Canceled:
      return true;
    default:
      return false;
  }
}

export function canAddAddendumToSWUOpportunity(o: SWUOpportunity): boolean {
  switch (o.status) {
    case SWUOpportunityStatus.Published:
    case SWUOpportunityStatus.EvaluationTeamQuestionsIndividual:
    case SWUOpportunityStatus.EvaluationTeamQuestionsConsensus:
    case SWUOpportunityStatus.EvaluationCodeChallenge:
    case SWUOpportunityStatus.EvaluationTeamScenario:
    case SWUOpportunityStatus.Processing:
    case SWUOpportunityStatus.Awarded:
    case SWUOpportunityStatus.Suspended:
    case SWUOpportunityStatus.Canceled:
      return true;
    default:
      return false;
  }
}

export function canChangeEvaluationPanel(o: SWUOpportunity): boolean {
  switch (o.status) {
    case SWUOpportunityStatus.Draft:
    case SWUOpportunityStatus.UnderReview:
    case SWUOpportunityStatus.Published:
    case SWUOpportunityStatus.Suspended:
    case SWUOpportunityStatus.EvaluationTeamQuestionsIndividual:
      return true;
    default:
      return false;
  }
}

export function isSWUOpportunityClosed(o: SWUOpportunity): boolean {
  return (
    isDateInThePast(o.proposalDeadline) &&
    o.status !== SWUOpportunityStatus.Published &&
    o.status !== SWUOpportunityStatus.Draft &&
    o.status !== SWUOpportunityStatus.UnderReview &&
    o.status !== SWUOpportunityStatus.Suspended
  );
}

export function hasSWUOpportunityPassedTeamQuestions(
  o: Pick<SWUOpportunity, "history">
): boolean {
  if (!o.history) {
    return false;
  }
  return o.history.reduce((acc, h) => {
    if (acc || h.type.tag !== "status") {
      return acc;
    }
    switch (h.type.value) {
      case SWUOpportunityStatus.EvaluationTeamQuestionsIndividual:
      case SWUOpportunityStatus.EvaluationTeamQuestionsConsensus:
      case SWUOpportunityStatus.EvaluationCodeChallenge:
      case SWUOpportunityStatus.EvaluationTeamScenario:
      case SWUOpportunityStatus.Processing:
      case SWUOpportunityStatus.Awarded:
        return true;
      default:
        return false;
    }
  }, false as boolean);
}

export function hasSWUOpportunityPassedCodeChallenge(
  o: Pick<SWUOpportunity, "history">
): boolean {
  if (!o.history) {
    return false;
  }
  return o.history.reduce((acc, h) => {
    if (acc || h.type.tag !== "status") {
      return acc;
    }
    switch (h.type.value) {
      case SWUOpportunityStatus.EvaluationCodeChallenge:
      case SWUOpportunityStatus.EvaluationTeamScenario:
      case SWUOpportunityStatus.Processing:
      case SWUOpportunityStatus.Awarded:
        return true;
      default:
        return false;
    }
  }, false as boolean);
}

export function hasSWUOpportunityPassedTeamScenario(
  o: Pick<SWUOpportunity, "history">
): boolean {
  if (!o.history) {
    return false;
  }
  return o.history.reduce((acc, h) => {
    if (acc || h.type.tag !== "status") {
      return acc;
    }
    switch (h.type.value) {
      case SWUOpportunityStatus.EvaluationTeamScenario:
      case SWUOpportunityStatus.Processing:
      case SWUOpportunityStatus.Awarded:
        return true;
      default:
        return false;
    }
  }, false as boolean);
}

export function doesSWUOpportunityStatusAllowGovToViewProposals(
  s: SWUOpportunityStatus
): boolean {
  switch (s) {
    case SWUOpportunityStatus.Draft:
    case SWUOpportunityStatus.UnderReview:
    case SWUOpportunityStatus.Published:
      return false;
    default:
      return true;
  }
}

export function doesSWUOpportunityStatusAllowGovToViewFullProposal(
  s: SWUOpportunityStatus
): boolean {
  switch (s) {
    case SWUOpportunityStatus.EvaluationCodeChallenge:
    case SWUOpportunityStatus.EvaluationTeamScenario:
    case SWUOpportunityStatus.Processing:
    case SWUOpportunityStatus.Awarded:
      return true;
    default:
      return false;
  }
}

export function doesSWUOpportunityStatusAllowGovToViewTeamQuestionResponseEvaluations(
  s: SWUOpportunityStatus
): boolean {
  switch (s) {
    case SWUOpportunityStatus.EvaluationCodeChallenge:
    case SWUOpportunityStatus.EvaluationTeamScenario:
    case SWUOpportunityStatus.Awarded:
      return true;
    default:
      return false;
  }
}
