import { ADT, BodyWithErrors, Id } from "shared/lib/types";
import { ErrorTypeFrom } from "shared/lib/validation";

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
  proposal: Id;
  evaluationPanelMember: Id;
  status: SWUTeamQuestionResponseEvaluationStatus;
  scores: SWUTeamQuestionResponseEvaluationScores[];
  createdAt: Date;
  updatedAt: Date;
}

export function getEvaluationScoreByOrder(
  evaluation: SWUTeamQuestionResponseEvaluation | null,
  order: number
): SWUTeamQuestionResponseEvaluationScores | null {
  return evaluation?.scores.find((s) => s.order === order) ?? null;
}

// Create.

export type CreateSWUTeamQuestionResponseEvaluationStatus =
  SWUTeamQuestionResponseEvaluationStatus.Draft;

export type CreateSWUTeamQuestionResponseEvaluationScoreBody =
  SWUTeamQuestionResponseEvaluationScores;

export interface CreateRequestBody {
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

export function isValidEvaluationStatusChange(
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

export function isValidConsensusStatusChange(
  from: SWUTeamQuestionResponseEvaluationStatus,
  to: SWUTeamQuestionResponseEvaluationStatus
): boolean {
  switch (from) {
    case SWUTeamQuestionResponseEvaluationStatus.Draft:
    case SWUTeamQuestionResponseEvaluationStatus.Submitted:
      return SWUTeamQuestionResponseEvaluationStatus.Submitted === to;
    default:
      return false;
  }
}
