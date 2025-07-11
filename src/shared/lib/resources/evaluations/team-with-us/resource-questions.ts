import { ADT, BodyWithErrors, Id } from "shared/lib/types";
import { ErrorTypeFrom } from "shared/lib/validation";

export function parseTWUResourceQuestionResponseEvaluationStatus(
  raw: string
): TWUResourceQuestionResponseEvaluationStatus | null {
  switch (raw) {
    case TWUResourceQuestionResponseEvaluationStatus.Draft:
      return TWUResourceQuestionResponseEvaluationStatus.Draft;
    case TWUResourceQuestionResponseEvaluationStatus.Submitted:
      return TWUResourceQuestionResponseEvaluationStatus.Submitted;
    default:
      return null;
  }
}

export enum TWUResourceQuestionResponseEvaluationStatus {
  Draft = "DRAFT",
  Submitted = "SUBMITTED"
}

export interface TWUResourceQuestionResponseEvaluationScores {
  notes: string;
  score: number;
  order: number;
}

export interface TWUResourceQuestionResponseEvaluation {
  proposal: Id;
  evaluationPanelMember: Id;
  status: TWUResourceQuestionResponseEvaluationStatus;
  scores: TWUResourceQuestionResponseEvaluationScores[];
  createdAt: Date;
  updatedAt: Date;
}

export function getEvaluationScoreByOrder(
  evaluation: TWUResourceQuestionResponseEvaluation | null,
  order: number
): TWUResourceQuestionResponseEvaluationScores | null {
  return evaluation?.scores.find((s) => s.order === order) ?? null;
}

// Create.

export type CreateTWUResourceQuestionResponseEvaluationStatus =
  TWUResourceQuestionResponseEvaluationStatus.Draft;

export type CreateTWUResourceQuestionResponseEvaluationScoreBody =
  TWUResourceQuestionResponseEvaluationScores;

export interface CreateRequestBody {
  status: CreateTWUResourceQuestionResponseEvaluationStatus;
  scores: CreateTWUResourceQuestionResponseEvaluationScoreBody[];
}

export interface CreateTWUResourceQuestionResponseEvaluationScoreValidationErrors
  extends ErrorTypeFrom<CreateTWUResourceQuestionResponseEvaluationScoreBody> {
  parseFailure?: string[];
}

export interface CreateValidationErrors extends BodyWithErrors {
  evaluationPanelMember?: string[];
  proposal?: string[];
  type?: string[];
  status?: string[];
  scores?: CreateTWUResourceQuestionResponseEvaluationScoreValidationErrors[];
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
  scores?: CreateTWUResourceQuestionResponseEvaluationScoreValidationErrors[];
}

export interface UpdateValidationErrors extends BodyWithErrors {
  evaluation?: UpdateADTErrors;
}

export function isValidEvaluationStatusChange(
  from: TWUResourceQuestionResponseEvaluationStatus,
  to: TWUResourceQuestionResponseEvaluationStatus
): boolean {
  switch (from) {
    case TWUResourceQuestionResponseEvaluationStatus.Draft:
      return TWUResourceQuestionResponseEvaluationStatus.Submitted === to;
    default:
      return false;
  }
}

export function isValidConsensusStatusChange(
  from: TWUResourceQuestionResponseEvaluationStatus,
  to: TWUResourceQuestionResponseEvaluationStatus
): boolean {
  switch (from) {
    case TWUResourceQuestionResponseEvaluationStatus.Draft:
    case TWUResourceQuestionResponseEvaluationStatus.Submitted:
      return TWUResourceQuestionResponseEvaluationStatus.Submitted === to;
    default:
      return false;
  }
}
