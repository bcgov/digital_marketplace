import { determineBusinessDays, getNumber, getString } from "shared/lib";
import {
  MAX_RESOURCE_QUESTION_WORD_LIMIT,
  TWUResourceQuestion
} from "shared/lib/resources/opportunity/team-with-us";
import {
  CreateTWUProposalStatus,
  CreateTWUProposalResourceQuestionResponseBody,
  CreateTWUProposalResourceQuestionResponseValidationErrors,
  parseTWUProposalStatus,
  TWUProposalStatus,
  UpdateResourceQuestionScoreBody,
  UpdateResourceQuestionScoreValidationErrors
} from "shared/lib/resources/proposal/team-with-us";
import {
  ArrayValidation,
  getInvalidValue,
  invalid,
  isInvalid,
  valid,
  validateArrayCustom,
  validateGenericString,
  validateGenericStringWords,
  validateNumber,
  validateNumberWithPrecision,
  Validation
} from "shared/lib/validation";

export function validateTWUProposalStatus(
  raw: string,
  isOneOf: TWUProposalStatus[]
): Validation<TWUProposalStatus> {
  const parsed = parseTWUProposalStatus(raw);
  if (!parsed) {
    return invalid([`"${raw}" is not a valid Team With Us proposal status.`]);
  }
  if (!isOneOf.includes(parsed)) {
    return invalid([`"${raw}" is not one of: ${isOneOf.join(", ")}`]);
  }
  return valid(parsed);
}

export function validateCreateTWUProposalStatus(
  raw: string
): Validation<CreateTWUProposalStatus> {
  return validateTWUProposalStatus(raw, [
    TWUProposalStatus.Draft,
    TWUProposalStatus.Submitted
  ]) as Validation<CreateTWUProposalStatus>;
}

export function validateTWUProposalResourceQuestionResponseResponse(
  raw: string,
  wordLimit = MAX_RESOURCE_QUESTION_WORD_LIMIT
): Validation<string> {
  return validateGenericStringWords(raw, "Response", 1, wordLimit);
}

export function validateTWUProposalResourceQuestionResponseOrder(
  raw: number,
  opportunityResourceQuestions: TWUResourceQuestion[]
): Validation<number> {
  return validateNumber(raw, 0, opportunityResourceQuestions.length, "Order");
}

export function validateTWUProposalResourceQuestionResponse(
  raw: any,
  opportunityResourceQuestions: TWUResourceQuestion[]
): Validation<
  CreateTWUProposalResourceQuestionResponseBody,
  CreateTWUProposalResourceQuestionResponseValidationErrors
> {
  const validatedOrder = validateTWUProposalResourceQuestionResponseOrder(
    getNumber(raw, "order"),
    opportunityResourceQuestions
  );
  if (isInvalid(validatedOrder)) {
    return invalid({
      order: getInvalidValue(validatedOrder, undefined)
    });
  }
  const wordLimit =
    opportunityResourceQuestions.find((q) => q.order === validatedOrder.value)
      ?.wordLimit || null;
  if (!wordLimit) {
    return invalid({
      order: ["No matching opportunity question."]
    });
  }
  const validatedResponse = validateTWUProposalResourceQuestionResponseResponse(
    getString(raw, "response"),
    wordLimit
  );
  if (isInvalid(validatedResponse)) {
    return invalid({
      response: getInvalidValue(validatedResponse, undefined)
    });
  } else {
    return valid({
      response: validatedResponse.value,
      order: validatedOrder.value
    } as CreateTWUProposalResourceQuestionResponseBody);
  }
}

export function validateTWUProposalResourceQuestionResponses(
  raw: any,
  opportunityResourceQuestions: TWUResourceQuestion[]
): ArrayValidation<
  CreateTWUProposalResourceQuestionResponseBody,
  CreateTWUProposalResourceQuestionResponseValidationErrors
> {
  if (!Array.isArray(raw)) {
    return invalid([
      { parseFailure: ["Please provide an array of responses."] }
    ]);
  }
  return validateArrayCustom(
    raw,
    (v) =>
      validateTWUProposalResourceQuestionResponse(
        v,
        opportunityResourceQuestions
      ),
    {}
  );
}

export function validateTWUProposalProposedCost(
  hourlyRate: number,
  opportunityBudget: number,
  opportunityAllocation: number,
  opportunityStartDate: Date,
  opportunityEndDate: Date
): Validation<number> {
  const dailyWorkHours = 8 * (opportunityAllocation / 100);
  const dailyCost = hourlyRate * dailyWorkHours;
  const numberOfDays = determineBusinessDays(
    opportunityStartDate,
    opportunityEndDate
  );
  const totalAmount = numberOfDays * dailyCost;

  if (totalAmount > opportunityBudget) {
    return invalid([
      "The proposed cost exceeds the maximum budget for this opportunity."
    ]);
  }
  return valid(totalAmount);
}

/**
 * Checks to see that the number passed is a number between a min/max value.
 * Currently, there is no max for a vendor's hourly rate.
 *
 * @param raw - hourly rate for vendor
 */
export function validateTWUHourlyRate(
  raw: number | string
): Validation<number> {
  return validateNumber(raw, 1, undefined, "Hourly Rate", "an");
}
export function validateNote(raw: string): Validation<string> {
  return validateGenericString(raw, "Note", 0, 5000);
}

export function validateDisqualificationReason(
  raw: string
): Validation<string> {
  return validateGenericString(raw, "Disqualification Reason", 1, 5000);
}

export function validateResourceQuestionScores(
  raw: any,
  opportunityResourceQuestions: TWUResourceQuestion[]
): ArrayValidation<
  UpdateResourceQuestionScoreBody,
  UpdateResourceQuestionScoreValidationErrors
> {
  if (!Array.isArray(raw)) {
    return invalid([{ parseFailure: ["Please provide an array of scores."] }]);
  }
  if (raw.length !== opportunityResourceQuestions.length) {
    return invalid([
      {
        parseFailure: [
          "Please provide the correct number of team question scores."
        ]
      }
    ]);
  }

  return validateArrayCustom(
    raw,
    (v) => validateResourceQuestionScore(v, opportunityResourceQuestions),
    {}
  );
}

export function validateResourceQuestionScore(
  raw: any,
  opportunityResourceQuestions: TWUResourceQuestion[]
): Validation<
  UpdateResourceQuestionScoreBody,
  UpdateResourceQuestionScoreValidationErrors
> {
  const validatedOrder = validateResourceQuestionScoreOrder(
    getNumber(raw, "order"),
    opportunityResourceQuestions.length
  );
  if (isInvalid(validatedOrder)) {
    return invalid({
      order: getInvalidValue(validatedOrder, undefined)
    });
  }
  const maxScore =
    opportunityResourceQuestions.find((q) => q.order === validatedOrder.value)
      ?.score || null;
  if (!maxScore) {
    return invalid({
      order: ["No matching opportunity question."]
    });
  }
  const validatedScore = validateResourceQuestionScoreScore(
    getNumber(raw, "score", 0, false),
    maxScore
  );
  if (isInvalid(validatedScore)) {
    return invalid({
      score: getInvalidValue(validatedScore, undefined)
    });
  } else {
    return valid({
      score: validatedScore.value,
      order: validatedOrder.value
    });
  }
}

export function validateResourceQuestionScoreOrder(
  raw: number,
  numOpportunityQuestions: number
): Validation<number> {
  return validateNumber(raw, 0, numOpportunityQuestions, "Order");
}

export function validateResourceQuestionScoreScore(
  raw: number,
  maxScore: number
): Validation<number> {
  return validateNumberWithPrecision(raw, 0, maxScore, 2, "Score");
}

export function validateCodeChallengeScore(raw: number): Validation<number> {
  return validateNumberWithPrecision(raw, 0, 100, 2, "Code Challenge Score");
}

export function validateTeamScenarioScore(raw: number): Validation<number> {
  return validateNumberWithPrecision(raw, 0, 100, 2, "Team Scenario Score");
}
