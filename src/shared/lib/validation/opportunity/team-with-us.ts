import { uniq } from "lodash";
import { getNumber, getString, setDateTo4PM } from "shared/lib";
import {
  CreateTWUOpportunityStatus,
  CreateTWUResourceQuestionBody,
  CreateTWUResourceQuestionValidationErrors,
  CreateTWUResourceValidationErrors,
  isTWUOpportunityClosed,
  MAX_RESOURCE_QUESTION_WORD_LIMIT,
  MAX_RESOURCE_QUESTIONS,
  parseTWUOpportunityStatus,
  TWUOpportunity,
  TWUOpportunityStatus,
  TWUResource,
  TWUServiceArea
} from "shared/lib/resources/opportunity/team-with-us";
import {
  allValid,
  ArrayValidation,
  getInvalidValue,
  invalid,
  mapValid,
  valid,
  validateArray,
  validateArrayCustom,
  validateDate,
  validateGenericString,
  validateNumber,
  Validation
} from "shared/lib/validation";

export { validateCapabilities } from "shared/lib/validation";
export { validateAddendumText } from "shared/lib/validation/addendum";

/**
 * @remarks
 *
 * Summary: This file holds validation functions that can be shared between the front and back-end for
 * Team With Us Opportunities. As a rule of thumb, and a point of distinction between other validation files
 * there are no database calls in this file.
 *
 * @see {@link src/back-end/lib/validation.ts}
 */

export function validateTWUOpportunityStatus(
  raw: string,
  isOneOf: TWUOpportunityStatus[]
): Validation<TWUOpportunityStatus> {
  const parsed = parseTWUOpportunityStatus(raw);
  if (!parsed) {
    return invalid([`"${raw}" is not a valid TeamWithUs opportunity status.`]);
  }
  if (!isOneOf.includes(parsed)) {
    return invalid([`"${raw}" is not one of: ${isOneOf.join(", ")}`]);
  }
  return valid(parsed);
}

export function validateCreateTWUOpportunityStatus(
  raw: string
): Validation<CreateTWUOpportunityStatus> {
  return validateTWUOpportunityStatus(raw, [
    TWUOpportunityStatus.Draft,
    TWUOpportunityStatus.UnderReview,
    TWUOpportunityStatus.Published
  ]) as Validation<CreateTWUOpportunityStatus>;
}

export function validateResourceQuestionQuestion(
  raw: string
): Validation<string> {
  return validateGenericString(raw, "Question", 1, 1000);
}

export function validateResourceQuestionGuideline(
  raw: string
): Validation<string> {
  return validateGenericString(raw, "Guideline", 1, 1000);
}

export function validateResourceQuestionScore(raw: number): Validation<number> {
  return validateNumber(raw, 1, undefined, "Score");
}

export function validateResourceQuestionWordLimit(
  raw: number
): Validation<number> {
  return validateNumber(raw, 1, MAX_RESOURCE_QUESTION_WORD_LIMIT, "Word Limit");
}

// Allow up to 100 resource questions per opportunity.
export function validateOrder(raw: number): Validation<number> {
  return validateNumber(raw, 0, MAX_RESOURCE_QUESTIONS, "Order", "an");
}

export function validateResourceQuestion(
  raw: any
): Validation<
  CreateTWUResourceQuestionBody,
  CreateTWUResourceQuestionValidationErrors
> {
  const validatedQuestion = validateResourceQuestionQuestion(
    getString(raw, "question")
  );
  const validatedGuideline = validateResourceQuestionGuideline(
    getString(raw, "guideline")
  );
  const validatedScore = validateResourceQuestionScore(getNumber(raw, "score"));
  const validatedWordLimit = validateResourceQuestionWordLimit(
    getNumber(raw, "wordLimit")
  );
  const validatedOrder = validateOrder(getNumber(raw, "order"));
  if (
    allValid([
      validatedQuestion,
      validatedGuideline,
      validatedScore,
      validatedWordLimit,
      validatedOrder
    ])
  ) {
    return valid({
      question: validatedQuestion.value,
      guideline: validatedGuideline.value,
      score: validatedScore.value,
      wordLimit: validatedWordLimit.value,
      order: validatedOrder.value
    } as CreateTWUResourceQuestionBody);
  } else {
    return invalid({
      question: getInvalidValue(validatedQuestion, undefined),
      guideline: getInvalidValue(validatedGuideline, undefined),
      score: getInvalidValue(validatedScore, undefined),
      wordLimit: getInvalidValue(validatedWordLimit, undefined),
      order: getInvalidValue(validatedOrder, undefined)
    });
  }
}

export function validateResourceQuestions(
  raw: any
): ArrayValidation<
  CreateTWUResourceQuestionBody,
  CreateTWUResourceQuestionValidationErrors
> {
  if (!Array.isArray(raw)) {
    return invalid([
      { parseFailure: ["Please provide an array of resource questions"] }
    ]);
  }
  return validateArrayCustom(raw, validateResourceQuestion, {});
}

export function validateResources(
  raw: any
): ArrayValidation<TWUResource, CreateTWUResourceValidationErrors> {
  if (!Array.isArray(raw)) {
    return invalid([
      { parseFailure: ["Please provide an array of resources"] }
    ]);
  }
  return validateArrayCustom(raw, validateResource, {});
}

function validateResource(
  raw: any
): Validation<TWUResource, CreateTWUResourceValidationErrors> {
  // ensure that the key is not greater than the number of enumerated values
  const validatedServiceArea = validateNumber(
    getNumber(raw, "serviceArea"),
    0,
    Object.keys(TWUServiceArea).length - 1
  );
  // const validatedServiceArea = validateGenericString(getString(raw, "serviceArea"), "serviceArea", 1)
  const validatedTargetAllocation = validateTargetAllocation(
    getNumber(raw, "targetAllocation")
  );
  const validatedOrder = validateOrder(getNumber(raw, "order"));

  if (
    allValid([validatedServiceArea, validatedTargetAllocation, validatedOrder])
  ) {
    return valid({
      serviceArea: validatedServiceArea.value,
      targetAllocation: validatedTargetAllocation.value,
      order: validatedOrder.value
    } as TWUResource);
  } else {
    return invalid({
      serviceArea: getInvalidValue(validatedServiceArea, undefined),
      targetAllocation: getInvalidValue(validatedTargetAllocation, undefined),
      order: getInvalidValue(validatedOrder, undefined)
    });
  }
}

export function validateMaxBudget(raw: string | number): Validation<number> {
  return validateNumber(raw, 1, undefined, "Maximum Budget");
}

export function validateOptionalSkills(raw: string[]): ArrayValidation<string> {
  const validatedArray = validateArray(raw, (v) =>
    validateGenericString(v, "Optional Skill", 1, 100)
  );
  return mapValid<string[], string[][], string[]>(validatedArray, (skills) =>
    uniq(skills)
  );
}

export function validateProposalDeadline(
  raw: string,
  opportunity?: TWUOpportunity
): Validation<Date> {
  let minDate = new Date();
  if (opportunity && isTWUOpportunityClosed(opportunity)) {
    minDate = opportunity.proposalDeadline;
  }
  return validateDate(raw, setDateTo4PM(minDate), undefined, setDateTo4PM);
}

export function validateQuestionsWeight(
  raw: string | number
): Validation<number> {
  return validateNumber(raw, 0, 100, "weight for resource questions", "a");
}

export function validateChallengeWeight(
  raw: string | number
): Validation<number> {
  return validateNumber(raw, 0, 100, "challenge weight", "a");
}

export function validatePriceWeight(raw: string | number): Validation<number> {
  return validateNumber(raw, 0, 100, "price weight", "a");
}

/**
 * Takes a number and validates that it's a percentage of full-time allocation
 *
 * @param raw - string argument
 * @returns
 */
export function validateTargetAllocation(raw: number): Validation<number> {
  return validateNumber(raw, 1, 100, "Target Allocation");
}

export function validateNote(raw: string): Validation<string> {
  return validateGenericString(raw, "Status Note", 0, 1000);
}
