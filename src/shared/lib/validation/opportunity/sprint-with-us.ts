import { get, uniq } from 'lodash';
import { SWU_MAX_BUDGET } from 'shared/config';
import { getISODateString, getNumber, getString, setDateTo4PM } from 'shared/lib';
import { CreateSWUOpportunityPhaseBody, CreateSWUOpportunityPhaseRequiredCapabilityBody, CreateSWUOpportunityPhaseRequiredCapabilityErrors, CreateSWUOpportunityPhaseValidationErrors, CreateSWUOpportunityStatus, CreateSWUTeamQuestionBody, CreateSWUTeamQuestionValidationErrors, isSWUOpportunityClosed, MAX_TEAM_QUESTION_WORD_LIMIT, MAX_TEAM_QUESTIONS, parseSWUOpportunityStatus, SWUOpportunity, SWUOpportunityStatus } from 'shared/lib/resources/opportunity/sprint-with-us';
import { allValid, ArrayValidation, getInvalidValue, getValidValue, invalid, mapValid, optional, valid, validateArray, validateArrayCustom, validateCapability, validateDate, validateGenericString, validateNumber, Validation } from 'shared/lib/validation';
import { isArray, isBoolean } from 'util';

export { validateCapabilities } from 'shared/lib/validation';
export { validateAddendumText } from 'shared/lib/validation/addendum';

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
  return validateDate(raw, setDateTo4PM(assignmentDate), undefined, setDateTo4PM);
}

export function validateSWUOpportunityPrototypePhaseStartDate(raw: string, inceptionCompletionDate?: Date): Validation<Date> {
  const now = new Date();
  const minDate = inceptionCompletionDate ? inceptionCompletionDate : now;
  return validateDate(raw, setDateTo4PM(minDate), undefined, setDateTo4PM);
}

export function validateSWUOpportunityImplementationPhaseStartDate(raw: string, prototypeCompletionDate?: Date): Validation<Date> {
  const now = new Date();
  const minDate = prototypeCompletionDate ? prototypeCompletionDate : now;
  return validateDate(raw, setDateTo4PM(minDate), undefined, setDateTo4PM);
}

export function validateSWUOpportunityPhaseCompletionDate(raw: string, startDate: Date): Validation<Date> {
  return validateDate(raw, setDateTo4PM(startDate), undefined, setDateTo4PM);
}

export function validateSWUOpportunityPhaseMaxBudget(raw: number, totalMaxBudget?: number): Validation<number> {
  return validateNumber(raw, 1, totalMaxBudget);
}

interface ValidatedCreateSWUOpportunityPhaseBody extends Omit<CreateSWUOpportunityPhaseBody, 'startDate' | 'completionDate'> {
  startDate: Date;
  completionDate: Date;
  requiredCapabilities: CreateSWUOpportunityPhaseRequiredCapabilityBody[];
}

export function validateFullTime(raw: any): Validation<boolean> {
  return isBoolean(raw) ? valid(raw) : invalid(['You must provide a boolean value.']);
}

export function validatePhaseRequiredCapabilities(raw: any): ArrayValidation<CreateSWUOpportunityPhaseRequiredCapabilityBody, CreateSWUOpportunityPhaseRequiredCapabilityErrors> {
  if (!isArray(raw)) { return invalid([{ parseFailure: ['Please provide an array of required capabilities.'] }]); }
  if (!raw.length) { return invalid([{ capability: ['Please select at least one required capability.'] }]); }
  return validateArrayCustom(raw, validatePhaseRequiredCapability, {});
}

export function validatePhaseRequiredCapability(raw: any): Validation<CreateSWUOpportunityPhaseRequiredCapabilityBody, CreateSWUOpportunityPhaseRequiredCapabilityErrors> {
  const validatedCapability = validateCapability(getString(raw, 'capability'));
  const validatedFullTime = validateFullTime(get(raw, 'fullTime'));
  if (allValid([validatedCapability, validatedFullTime])) {
    return valid({
      capability: validatedCapability.value,
      fullTime: validatedFullTime.value
    } as CreateSWUOpportunityPhaseRequiredCapabilityBody);
  } else {
    return invalid({
      capability: getInvalidValue(validatedCapability, undefined),
      fullTime: getInvalidValue(validatedFullTime, undefined)
    });
  }
}

export function validateSWUOpportunityInceptionPhase(value: any, opportunityAssignmentDate: Date): Validation<ValidatedCreateSWUOpportunityPhaseBody | undefined, CreateSWUOpportunityPhaseValidationErrors> {
  return optional(value, (raw): Validation<ValidatedCreateSWUOpportunityPhaseBody | undefined, CreateSWUOpportunityPhaseValidationErrors> => {
    const validatedStartDate = validateSWUOpportunityInceptionPhaseStartDate(getISODateString(raw, 'startDate'), opportunityAssignmentDate);
    const rawCompletionDate = getISODateString(raw, 'completionDate');
    const validatedCompletionDate = validateSWUOpportunityPhaseCompletionDate(rawCompletionDate, getValidValue(validatedStartDate, new Date()));
    const validatedMaxBudget = validateSWUOpportunityPhaseMaxBudget(getNumber(raw, 'maxBudget'));
    const validatedRequiredCapabilities = validatePhaseRequiredCapabilities(get(raw, 'requiredCapabilities'));
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
  });
}

export function validateSWUOpportunityPrototypePhase(value: any, inceptionPhaseCompletionDate?: Date): Validation<ValidatedCreateSWUOpportunityPhaseBody | undefined, CreateSWUOpportunityPhaseValidationErrors> {
  return optional(value, (raw): Validation<ValidatedCreateSWUOpportunityPhaseBody | undefined, CreateSWUOpportunityPhaseValidationErrors> => {
    const validatedStartDate  = validateSWUOpportunityPrototypePhaseStartDate(getISODateString(raw, 'startDate'), inceptionPhaseCompletionDate);
    const rawCompletionDate = getISODateString(raw, 'completionDate');
    const validatedCompletionDate = validateSWUOpportunityPhaseCompletionDate(rawCompletionDate, getValidValue(validatedStartDate, new Date()));
    const validatedMaxBudget = validateSWUOpportunityPhaseMaxBudget(getNumber(raw, 'maxBudget'));
    const validatedRequiredCapabilities = validatePhaseRequiredCapabilities(get(raw, 'requiredCapabilities'));

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
  });
}

export function validateSWUOpportunityImplementationPhase(raw: any, prototypeCompletionDate?: Date): Validation<ValidatedCreateSWUOpportunityPhaseBody, CreateSWUOpportunityPhaseValidationErrors> {
  const validatedStartDate  = validateSWUOpportunityImplementationPhaseStartDate(getISODateString(raw, 'startDate'), prototypeCompletionDate);
  const rawCompletionDate = getISODateString(raw, 'completionDate');
  const validatedCompletionDate = validateSWUOpportunityPhaseCompletionDate(rawCompletionDate, getValidValue(validatedStartDate, new Date()));
  const validatedMaxBudget = validateSWUOpportunityPhaseMaxBudget(getNumber(raw, 'maxBudget'));
  const validatedRequiredCapabilities = validatePhaseRequiredCapabilities(get(raw, 'requiredCapabilities'));

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
  return validateNumber(raw, 1, MAX_TEAM_QUESTION_WORD_LIMIT, 'Word Limit');
}

// Allow up to 100 team questions per opportunity.
export function validateTeamQuestionOrder(raw: number): Validation<number> {
  return validateNumber(raw, 0, MAX_TEAM_QUESTIONS, 'Order', 'an');
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

export function validateRemoteDesc(raw: string, remoteOk: boolean): Validation<string> {
  return validateGenericString(raw, 'Remote description', remoteOk ? 1 : 0, 500);
}

export function validateLocation(raw: string): Validation<string> {
  return validateGenericString(raw, 'Location', 1);
}

export function validateTotalMaxBudget(raw: string | number): Validation<number> {
  return validateNumber(raw, 1, SWU_MAX_BUDGET, 'Total Maximum Budget', 'a');
}

export function validateMinimumTeamMembers(raw?: number | null): Validation<number | null> {
  return mapValid(
    optional(raw, v => validateNumber(v, 1, 5, 'minimum team size', 'a')),
    v => v || null
  );
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
  if (opportunity && isSWUOpportunityClosed(opportunity)) {
    minDate = opportunity.proposalDeadline;
  }
  return validateDate(raw, setDateTo4PM(minDate), undefined, setDateTo4PM);
}

export function validateAssignmentDate(raw: string, proposalDeadline: Date): Validation<Date> {
  return validateDate(raw, setDateTo4PM(proposalDeadline), undefined, setDateTo4PM);
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
