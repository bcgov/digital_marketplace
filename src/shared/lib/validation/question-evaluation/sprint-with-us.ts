import { isArray } from "lodash";
import { getNumber, getString } from "shared/lib";
import { SWUProposalTeamQuestionResponse } from "shared/lib/resources/proposal/sprint-with-us";
import {
  CreateSWUTeamQuestionResponseEvaluationScoreBody,
  CreateSWUTeamQuestionResponseEvaluationScoreValidationErrors,
  parseSWUTeamQuestionResponseEvaluationStatus,
  parseSWUTeamQuestionResponseEvaluationType,
  SWUTeamQuestionResponseEvaluationStatus,
  SWUTeamQuestionResponseEvaluationType
} from "shared/lib/resources/question-evaluation/sprint-with-us";
import {
  ArrayValidation,
  getInvalidValue,
  invalid,
  isInvalid,
  valid,
  validateArrayCustom,
  validateGenericStringWords,
  validateNumber,
  Validation
} from "shared/lib/validation";

function makeValidateSWUTeamQuestionResponseEvaluationEnum<T>(
  parse: (raw: string) => T | null,
  parseErrorMsg: (raw: string) => string,
  notOneOfErrorMsg: (raw: string, isOneOf: T[]) => string
): (raw: string, isOneOf: T[]) => Validation<T> {
  return (raw, isOneOf) => {
    const parsed = parse(raw);
    if (!parsed) {
      return invalid([parseErrorMsg(raw)]);
    }

    if (!isOneOf.includes(parsed)) {
      return invalid([notOneOfErrorMsg(raw, isOneOf)]);
    }

    return valid(parsed);
  };
}

export const validateSWUTeamQuestionResponseEvaluationType =
  makeValidateSWUTeamQuestionResponseEvaluationEnum<SWUTeamQuestionResponseEvaluationType>(
    parseSWUTeamQuestionResponseEvaluationType,
    (raw) =>
      `"${raw}" is not a valid SprintWithUs team question response evaluation type.`,
    (raw, isOneOf) => `"${raw}" is not one of: ${isOneOf.join(", ")}`
  );

export const validateSWUTeamQuestionResponseEvaluationStatus =
  makeValidateSWUTeamQuestionResponseEvaluationEnum<SWUTeamQuestionResponseEvaluationStatus>(
    parseSWUTeamQuestionResponseEvaluationStatus,
    (raw) =>
      `"${raw}" is not a valid SprintWithUs team question response evaluation status.`,
    (raw, isOneOf) => `"${raw}" is not one of: ${isOneOf.join(", ")}`
  );

export function validateSWUTeamQuestionResponseEvaluationScoreOrder(
  raw: number,
  proposalTeamQuestionResponses: SWUProposalTeamQuestionResponse[]
): Validation<number> {
  return validateNumber(raw, 0, proposalTeamQuestionResponses.length, "Order");
}

export function validateSWUTeamQuestionResponseEvaluationScoreScore(
  raw: number
): Validation<number> {
  return validateNumber(raw, 1, undefined, "Score");
}

export function validateSWUTeamQuestionResponseEvaluationScoreNotes(
  raw: string
): Validation<string> {
  return validateGenericStringWords(raw, "Notes", 1);
}

export function validateSWUTeamQuestionResponseEvaluationScore(
  raw: any,
  proposalTeamQuestionResponses: SWUProposalTeamQuestionResponse[]
): Validation<
  CreateSWUTeamQuestionResponseEvaluationScoreBody,
  CreateSWUTeamQuestionResponseEvaluationScoreValidationErrors
> {
  const validatedOrder = validateSWUTeamQuestionResponseEvaluationScoreOrder(
    getNumber(raw, "order"),
    proposalTeamQuestionResponses
  );
  if (isInvalid(validatedOrder)) {
    return invalid({
      order: getInvalidValue(validatedOrder, undefined)
    });
  }
  const proposalTeamQuestionResponse = proposalTeamQuestionResponses.find(
    (q) => q.order === validatedOrder.value
  );
  if (!proposalTeamQuestionResponse) {
    return invalid({
      order: ["No matching proposal team question response."]
    });
  }
  const validatedScore = validateSWUTeamQuestionResponseEvaluationScoreScore(
    getNumber(raw, "score")
  );
  if (isInvalid(validatedScore)) {
    return invalid({
      score: getInvalidValue(validatedScore, undefined)
    });
  }
  const validatedNotes = validateSWUTeamQuestionResponseEvaluationScoreNotes(
    getString(raw, "notes")
  );
  if (isInvalid(validatedNotes)) {
    return invalid({
      notes: getInvalidValue(validatedNotes, undefined)
    });
  } else {
    return valid({
      notes: validatedNotes.value,
      order: validatedOrder.value,
      score: validatedScore.value
    } as CreateSWUTeamQuestionResponseEvaluationScoreBody);
  }
}

export function validateSWUTeamQuestionResponseEvaluationScores(
  raw: any,
  proposalTeamQuestionResponses: SWUProposalTeamQuestionResponse[]
): ArrayValidation<
  CreateSWUTeamQuestionResponseEvaluationScoreBody,
  CreateSWUTeamQuestionResponseEvaluationScoreValidationErrors
> {
  if (!isArray(raw)) {
    return invalid([
      {
        parseFailure: [
          "Please provide an array of team question response evaluations."
        ]
      }
    ]);
  }
  return validateArrayCustom(
    raw,
    (v) =>
      validateSWUTeamQuestionResponseEvaluationScore(
        v,
        proposalTeamQuestionResponses
      ),
    {}
  );
}
