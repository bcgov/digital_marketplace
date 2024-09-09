import { ADT, BodyWithErrors, Id } from "shared/lib/types";
import { ErrorTypeFrom } from "shared/lib/validation";
import { SWUEvaluationPanelMember } from "src/shared/lib/resources/opportunity/sprint-with-us";
import { SWUProposalSlim } from "src/shared/lib/resources/proposal/sprint-with-us";

export function parseSWUTeamQuestionResponseEvaluationType(
  raw: string
): SWUTeamQuestionResponseEvaluationType | null {
  switch (raw) {
    case SWUTeamQuestionResponseEvaluationType.Conensus:
      return SWUTeamQuestionResponseEvaluationType.Conensus;
    case SWUTeamQuestionResponseEvaluationType.Individual:
      return SWUTeamQuestionResponseEvaluationType.Individual;
    default:
      return null;
  }
}

export function parseSWUTeamQuestionResponseEvaluationStatus(
  raw: string
): SWUTeamQuestionResponseEvaluationStatus | null {
  switch (raw) {
    case SWUTeamQuestionResponseEvaluationStatus.Draft:
      return SWUTeamQuestionResponseEvaluationStatus.Draft;
    case SWUTeamQuestionResponseEvaluationStatus.Submitted:
      return SWUTeamQuestionResponseEvaluationStatus.Submitted;
    default:
      return null;
  }
}

export enum SWUTeamQuestionResponseEvaluationType {
  Conensus = "CONSENSUS",
  Individual = "INDIVIDUAL"
}

export enum SWUTeamQuestionResponseEvaluationStatus {
  Draft = "DRAFT",
  Submitted = "SUBMITTED"
}

export interface SWUTeamQuestionResponseEvaluationScores {
  notes: string;
  score: number;
  order: number;
}

export interface SWUTeamQuestionResponseEvaluation {
  id: Id;
  proposal: SWUProposalSlim;
  evaluationPanelMember: SWUEvaluationPanelMember;
  status: SWUTeamQuestionResponseEvaluationStatus;
  type: SWUTeamQuestionResponseEvaluationType;
  scores: SWUTeamQuestionResponseEvaluationScores[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SWUTeamQuestionResponseEvaluationSlim
  extends Omit<
    SWUTeamQuestionResponseEvaluation,
    "proposal" | "evaluationPanelMember" | "scores"
  > {
  scores: Omit<SWUTeamQuestionResponseEvaluationScores, "notes">[];
}

// Create.

export type CreateSWUTeamQuestionResponseEvaluationStatus =
  SWUTeamQuestionResponseEvaluationStatus.Draft;

export type CreateSWUTeamQuestionResponseEvaluationScoreBody =
  SWUTeamQuestionResponseEvaluationScores;

export interface CreateRequestBody {
  proposal: Id;
  type: SWUTeamQuestionResponseEvaluationType;
  status: CreateSWUTeamQuestionResponseEvaluationStatus;
  scores: CreateSWUTeamQuestionResponseEvaluationScoreBody[];
}

export interface CreateSWUTeamQuestionResponseEvaluationScoreValidationErrors
  extends ErrorTypeFrom<CreateSWUTeamQuestionResponseEvaluationScoreBody> {
  parseFailure?: string[];
}

export interface CreateValidationErrors extends BodyWithErrors {
  evaluationPanelMember?: string[];
  proposal?: string[];
  type?: string[];
  status?: string[];
  scores?: CreateSWUTeamQuestionResponseEvaluationScoreValidationErrors[];
}

// Update.

export type UpdateRequestBody =
  | ADT<"edit", UpdateEditRequestBody>
  | ADT<"submit", string>;

export type UpdateEditRequestBody = Omit<
  CreateRequestBody,
  "proposal" | "type" | "status"
>;

type UpdateADTErrors =
  | ADT<"edit", UpdateEditValidationErrors>
  | ADT<"submit", string[]>
  | ADT<"parseFailure">;

export interface UpdateEditValidationErrors {
  scores?: CreateSWUTeamQuestionResponseEvaluationScoreValidationErrors[];
}

export interface UpdateValidationErrors extends BodyWithErrors {
  evaluation?: UpdateADTErrors;
}

export function isValidStatusChange(
  from: SWUTeamQuestionResponseEvaluationStatus,
  to: SWUTeamQuestionResponseEvaluationStatus
): boolean {
  switch (from) {
    case SWUTeamQuestionResponseEvaluationStatus.Draft:
      return SWUTeamQuestionResponseEvaluationStatus.Submitted === to;
    default:
      return false;
  }
}
