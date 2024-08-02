import { ADT, BodyWithErrors, Id } from "shared/lib/types";
import { ErrorTypeFrom } from "shared/lib/validation";

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

interface SWUTeamQuestionResponseEvaluationScores {
  notes: string;
  score: number;
  order: number;
}

export interface SWUTeamQuestionResponseEvaluation {
  proposal: Id;
  status: SWUTeamQuestionResponseEvaluationStatus;
  type: SWUTeamQuestionResponseEvaluationType;
  scores: SWUTeamQuestionResponseEvaluationScores[];
}

// Create.

export interface CreateRequestBody extends SWUTeamQuestionResponseEvaluation {
  opportunity: Id;
}

export interface CreateValidationErrors
  extends ErrorTypeFrom<CreateRequestBody>,
    BodyWithErrors {}

// Update.

export type UpdateRequestBody =
  | ADT<"edit", UpdateEditRequestBody>
  | ADT<"submit", string>;

export type UpdateEditRequestBody = CreateRequestBody;
