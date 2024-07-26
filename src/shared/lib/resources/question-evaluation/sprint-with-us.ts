import { ADT, BodyWithErrors, Id } from "shared/lib/types";
import { ErrorTypeFrom } from "shared/lib/validation";

export enum SWUTeamQuestionResponseEvaluationType {
  Conensus = "CONSENSUS",
  Individual = "INDIVIDUAL"
}

interface SWUTeamQuestionResponseEvaluationScores {
  notes: string;
  score: number;
  order: number;
}

export interface SWUTeamQuestionResponseEvaluation {
  proposal: Id;
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
