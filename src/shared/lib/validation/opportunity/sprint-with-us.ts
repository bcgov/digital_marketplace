import { uniq } from 'lodash';
import { dateToMidnight, getNumber, getString, getStringArray, isDateInThePast } from 'shared/lib';
import CAPABILITIES from 'shared/lib/data/capabilities';
import { CreateSWUOpportunityPhaseBody, CreateSWUOpportunityPhaseValidationErrors, CreateSWUOpportunityStatus, CreateSWUTeamQuestionBody, CreateSWUTeamQuestionValidationErrors, parseSWUOpportunityStatus, SWUOpportunity, SWUOpportunityStatus } from 'shared/lib/resources/opportunity/sprint-with-us';
import { allValid, ArrayValidation, getInvalidValue, getValidValue, invalid, mapValid, valid, validateArray, validateArrayCustom, validateDate, validateGenericString, validateNumber, Validation } from 'shared/lib/validation';
import { isArray, isBoolean } from 'util';

export function validateSWUOpportunityStatus(raw: string, isOneOf: SWUOpportunityStatus[]): Validation<SWUOpportunityStatus> {
  const parsed = parseSWUOpportunityStatus(raw);
  if (!parsed) { return invalid([`"${raw}" is not a valid SprintWithUs opportunity status.`]); }
  if (!isOneOf.includes(parsed)) {
    return invalid([`"${raw}" is not one of: ${isOneOf.join(', ')}`]);
  }
  return valid(parsed);
}

export function validateCreateSWUOpportunityStatus(raw: string): Validation<CreateSWUOpportunityStatus> {
  return validateSWUOpportunityStatus(raw, [SWUOpportunityStatus.Draft, SWUOpportunityStatus.UnderReview, SWUOpportunityStatus.Published]) as Validation<CreateSWUOpportunityStatus>;
}

export function validateSWUOpportunityInceptionPhaseStartDate(raw: string, assignmentDate: Date): Validation<Date> {
  return validateDate(raw, assignmentDate);
}

export function validateSWUOpportunityPrototypePhaseStartDate(raw: string, inceptionCompletionDate?: Date): Validation<Date> {
  const now = new Date();
  const minDate = inceptionCompletionDate ? inceptionCompletionDate : now;
  return validateDate(raw, minDate);
}

export function validateSWUOpportunityImplementationPhaseStartDate(raw: string, prototypeCompletionDate?: Date): Validation<Date> {
  const now = new Date();
  const minDate = prototypeCompletionDate ? prototypeCompletionDate : now;
  return validateDate(raw, minDate);
}

export function validateSWUOpportunityPhaseCompletionDate(raw: string, startDate: Date): Validation<Date> {
  return validateDate(raw, startDate);
}

export function validateSWUOpportunityPhaseMaxBudget(raw: number, maxTotalBudget?: number): Validation<number> {
  return validateNumber(raw, 0, maxTotalBudget);
}

export function validateCapability(raw: string): Validation<string> {
  return CAPABILITIES.includes(raw) ? valid(raw) : invalid(['Please select a capability from the list.']);
}

export function validateSWUOpportunityPhaseRequiredCapabilities(raw: string[]): ArrayValidation<string> {
  if (!raw.length) { return invalid([['Please select at least one capability.']]); }
  const validatedArray = validateArray(raw, v => validateCapability(v));
  return mapValid(validatedArray, capabilities => uniq(capabilities));
}

interface ValidatedCreateSWUOpportunityPhaseBody extends Omit<CreateSWUOpportunityPhaseBody, 'startDate' | 'completionDate'> {
  startDate: Date;
  completionDate: Date;
}

export function validateSWUOpportunityInceptionPhase(raw: any, opportunityAssignmentDate: Date): Validation<ValidatedCreateSWUOpportunityPhaseBody, CreateSWUOpportunityPhaseValidationErrors> {
  const validatedStartDate = validateSWUOpportunityInceptionPhaseStartDate(getString(raw, 'startDate'), opportunityAssignmentDate);
  const validatedCompletionDate = validateSWUOpportunityPhaseCompletionDate(getString(raw, 'completionDate'), getValidValue(validatedStartDate, new Date()));
  const validatedMaxBudget = validateSWUOpportunityPhaseMaxBudget(getNumber(raw, 'maxBudget'));
  const validatedRequiredCapabilities = validateSWUOpportunityPhaseRequiredCapabilities(getStringArray(raw, 'requiredCapabilities'));

  if (allValid([
    validatedStartDate,
    validatedCompletionDate,
    validatedMaxBudget,
    validatedRequiredCapabilities
  ])) {
    return valid({
      startDate: validatedStartDate.value,
      completionDate: validatedCompletionDate.value,
      maxBudget: validatedMaxBudget.value,
      requiredCapabilities: validatedRequiredCapabilities.value
    } as ValidatedCreateSWUOpportunityPhaseBody);
  } else {
    return invalid({
      startDate: getInvalidValue(validatedStartDate, undefined),
      completionDate: getInvalidValue(validatedCompletionDate, undefined),
      maxBudget: getInvalidValue(validatedMaxBudget, undefined),
      requiredCapabilities: getInvalidValue(validatedRequiredCapabilities, undefined)
    });
  }
}

export function validateSWUOpportunityPrototypePhase(raw: any, inceptionPhaseCompletionDate?: Date): Validation<ValidatedCreateSWUOpportunityPhaseBody, CreateSWUOpportunityPhaseValidationErrors> {
  const validatedStartDate  = validateSWUOpportunityPrototypePhaseStartDate(getString(raw, 'startDate'), inceptionPhaseCompletionDate);
  const validatedCompletionDate = validateSWUOpportunityPhaseCompletionDate(getString(raw, 'completionDate'), getValidValue(validatedStartDate, new Date()));
  const validatedMaxBudget = validateSWUOpportunityPhaseMaxBudget(getNumber(raw, 'maxBudget'));
  const validatedRequiredCapabilities = validateSWUOpportunityPhaseRequiredCapabilities(getStringArray(raw, 'requiredCapabilities'));

  if (allValid([
    validatedStartDate,
    validatedCompletionDate,
    validatedMaxBudget,
    validatedRequiredCapabilities
  ])) {
    return valid({
      startDate: validatedStartDate.value,
      completionDate: validatedCompletionDate.value,
      maxBudget: validatedMaxBudget.value,
      requiredCapabilities: validatedRequiredCapabilities.value
    } as ValidatedCreateSWUOpportunityPhaseBody);
  } else {
    return invalid({
      startDate: getInvalidValue(validatedStartDate, undefined),
      completionDate: getInvalidValue(validatedCompletionDate, undefined),
      maxBudget: getInvalidValue(validatedMaxBudget, undefined),
      requiredCapabilities: getInvalidValue(validatedRequiredCapabilities, undefined)
    });
  }
}

export function validateSWUOpportunityImplementationPhase(raw: any, prototypeCompletionDate?: Date): Validation<ValidatedCreateSWUOpportunityPhaseBody, CreateSWUOpportunityPhaseValidationErrors> {
  const validatedStartDate  = validateSWUOpportunityImplementationPhaseStartDate(getString(raw, 'startDate'), prototypeCompletionDate);
  const validatedCompletionDate = validateSWUOpportunityPhaseCompletionDate(getString(raw, 'completionDate'), getValidValue(validatedStartDate, new Date()));
  const validatedMaxBudget = validateSWUOpportunityPhaseMaxBudget(getNumber(raw, 'maxBudget'));
  const validatedRequiredCapabilities = validateSWUOpportunityPhaseRequiredCapabilities(getStringArray(raw, 'requiredCapabilities'));

  if (allValid([
    validatedStartDate,
    validatedCompletionDate,
    validatedMaxBudget,
    validatedRequiredCapabilities
  ])) {
    return valid({
      startDate: validatedStartDate.value,
      completionDate: validatedCompletionDate.value,
      maxBudget: validatedMaxBudget.value,
      requiredCapabilities: validatedRequiredCapabilities.value
    } as ValidatedCreateSWUOpportunityPhaseBody);
  } else {
    return invalid({
      startDate: getInvalidValue(validatedStartDate, undefined),
      completionDate: getInvalidValue(validatedCompletionDate, undefined),
      maxBudget: getInvalidValue(validatedMaxBudget, undefined),
      requiredCapabilities: getInvalidValue(validatedRequiredCapabilities, undefined)
    });
  }
}

export function validateTeamQuestionQuestion(raw: string): Validation<string> {
  return validateGenericString(raw, 'Question', 1, 1000);
}

export function validateTeamQuestionGuideline(raw: string): Validation<string> {
  return validateGenericString(raw, 'Guideline', 1, 1000);
}

export function validateTeamQuestionScore(raw: number): Validation<number> {
  return validateNumber(raw, 1, undefined, 'Score');
}

export function validateTeamQuestionWordLimit(raw: number): Validation<number> {
  return validateNumber(raw, 1, undefined, 'Word Limit');
}

export function validateTeamQuestionOrder(raw: number): Validation<number> {
  return validateNumber(raw, 1, 10, 'Order');
}

export function validateTeamQuestion(raw: any): Validation<CreateSWUTeamQuestionBody, CreateSWUTeamQuestionValidationErrors> {
  const validatedQuestion = validateTeamQuestionQuestion(getString(raw, 'question'));
  const validatedGuideline = validateTeamQuestionGuideline(getString(raw, 'guideline'));
  const validatedScore = validateTeamQuestionScore(getNumber(raw, 'score'));
  const validatedWordLimit = validateTeamQuestionWordLimit(getNumber(raw, 'wordLimit'));
  const validatedOrder = validateTeamQuestionOrder(getNumber(raw, 'order'));
  if (allValid([
    validatedQuestion,
    validatedGuideline,
    validatedScore,
    validatedWordLimit,
    validatedOrder
  ])) {
    return valid({
      question: validatedQuestion.value,
      guideline: validatedGuideline.value,
      score: validatedScore.value,
      wordLimit: validatedWordLimit.value,
      order: validatedOrder.value
    } as CreateSWUTeamQuestionBody);
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

export function validateTeamQuestions(raw: any): ArrayValidation<CreateSWUTeamQuestionBody, CreateSWUTeamQuestionValidationErrors> {
  if (!isArray(raw)) { return invalid([{ parseFailure: ['Please provide an array of team questions'] }]); }
  return validateArrayCustom(raw, validateTeamQuestion, {});
}

export function validateTitle(raw: string): Validation<string> {
  return validateGenericString(raw, 'Title', 1, 200);
}

export function validateTeaser(raw: string): Validation<string> {
  return validateGenericString(raw, 'Teaser', 0, 500);
}

export function validateRemoteOk(raw: any): Validation<boolean> {
  return isBoolean(raw) ? valid(raw) : invalid(['Invalid remote option provided.']);
}

export function validateRemoteDesc(raw: string): Validation<string> {
  return validateGenericString(raw, 'Remote Description', 0, 500);
}

export function validateLocation(raw: string): Validation<string> {
  return validateGenericString(raw, 'Location', 1);
}

export function validateTotalMaxBudget(raw: string | number): Validation<number> {
  return validateNumber(raw, 1, 2000000, 'max budget', 'a');
}

export function validateMinimumTeamMembers(raw: string | number): Validation<number> {
  return validateNumber(raw, 1, 5, 'minimum team count', 'a');
}

export function validateMandatorySkills(raw: string[]): ArrayValidation<string> {
  if (!raw.length) { return invalid([['Please select at least one skill.']]); }
  const validatedArray = validateArray(raw, v => validateGenericString(v, 'Mandatory Skill', 1, 100));
  return mapValid(validatedArray, skills => uniq(skills));
}

export function validateOptionalSkills(raw: string[]): ArrayValidation<string> {
  const validatedArray = validateArray(raw, v => validateGenericString(v, 'Optional Skill', 1, 100));
  return mapValid(validatedArray, skills => uniq(skills));
}

export function validateDescription(raw: string): Validation<string> {
  return validateGenericString(raw, 'Description', 1, 10000);
}

export function validateProposalDeadline(raw: string, opportunity?: SWUOpportunity): Validation<Date> {
  const now = new Date();
  let minDate = now;
  if (opportunity && opportunity.status !== SWUOpportunityStatus.Draft) {
    minDate = isDateInThePast(opportunity.proposalDeadline) ? opportunity.proposalDeadline : now;
  }
  return validateDate(raw, dateToMidnight(minDate));
}

export function validateAssignmentDate(raw: string, proposalDeadline: Date): Validation<Date> {
  return validateDate(raw, proposalDeadline);
}

export function validateQuestionsWeight(raw: string | number): Validation<number> {
  return validateNumber(raw, 0, 100, 'weight for team questions', 'a');
}

export function validateCodeChallengeWeight(raw: string | number): Validation<number> {
  return validateNumber(raw, 0, 100, 'code challenge weight', 'a');
}

export function validateTeamScenarioWeight(raw: string | number): Validation<number> {
  return validateNumber(raw, 0, 100, 'team scenario weight', 'a');
}

export function validatePriceWeight(raw: string | number): Validation<number> {
  return validateNumber(raw, 0, 100, 'price weight', 'a');
}

export function validateNote(raw: string): Validation<string> {
  return validateGenericString(raw, 'Status Note', 0, 1000);
}
