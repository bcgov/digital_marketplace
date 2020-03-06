import { uniq } from 'lodash';
import { dateToMidnight, isDateInThePast } from 'shared/lib';
import { CreateSWUOpportunityStatus, parseSWUOpportunityStatus, SWUOpportunity, SWUOpportunityStatus } from 'shared/lib/resources/opportunity/sprint-with-us';
import { ArrayValidation, invalid, mapValid, valid, validateArray, validateDate, validateGenericString, validateNumber, Validation } from 'shared/lib/validation';
import { isBoolean } from 'util';

export function validateSWUOpportunityStatus(raw: string, isOneOf: SWUOpportunityStatus[]): Validation<SWUOpportunityStatus> {
  const parsed = parseSWUOpportunityStatus(raw);
  if (!parsed) { return invalid([`"${raw}" is not a valid SprintWithUs opportunity status.`]); }
  if (!isOneOf.includes(parsed)) {
    return invalid([`"${raw}" is not one of: ${isOneOf.join(', ')}`]);
  }
  return valid(parsed);
}

export function validateCreateSWUOpportunityStatus(raw: string): Validation<CreateSWUOpportunityStatus> {
  return validateSWUOpportunityStatus(raw, [SWUOpportunityStatus.Draft, SWUOpportunityStatus.Published]) as Validation<CreateSWUOpportunityStatus>;
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
