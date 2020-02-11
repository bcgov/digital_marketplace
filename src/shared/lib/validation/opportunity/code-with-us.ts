import { uniq } from 'lodash';
import { CWUOpportunityStatus, parseCWUOpportunityStatus } from 'shared/lib/resources/opportunity/code-with-us';
import { ArrayValidation, invalid, mapValid, valid, validateArray, validateDate, validateGenericString, validateNumber, Validation } from 'shared/lib/validation';
import { isBoolean } from 'util';

export function validateCWUOpportunityStatus(raw: string, isOneOf: CWUOpportunityStatus[]): Validation<CWUOpportunityStatus> {
  const parsed = parseCWUOpportunityStatus(raw);
  if (!parsed) { return invalid([`"${raw}" is not a valid CodeWithUs opportunity status.`]); }
  if (!isOneOf.includes(parsed)) {
    return invalid([`"${raw}" is not one of: ${isOneOf.join(', ')}`]);
  }
  return valid(parsed);
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

export function validateReward(raw: string | number): Validation<number> {
  return validateNumber(raw, 1, 70000, 'reward', 'a');
}

export function validateSkills(raw: string[]): ArrayValidation<string> {
  if (!raw.length) { return invalid([['Please select at least one skill.']]); }
  const validatedArray = validateArray(raw, v => validateGenericString(v, 'Skill', 1, 100));
  return mapValid(validatedArray, skills => uniq(skills));
}

export function validateDescription(raw: string): Validation<string> {
  return validateGenericString(raw, 'Description', 1, 10000);
}

export function validateProposalDeadline(raw: string): Validation<Date> {
  return validateDate(raw, new Date());
}

export function validateAssignmentDate(raw: string, proposalDeadline: Date): Validation<Date> {
  return validateDate(raw, proposalDeadline);
}

export function validateStartDate(raw: string, assignmentDate: Date): Validation<Date> {
  return validateDate(raw, assignmentDate);
}

export function validateCompletionDate(raw: string, startDate: Date): Validation<Date> {
  return validateDate(raw, startDate);
}

export function validateSubmissionInfo(raw: string): Validation<string> {
  return validateGenericString(raw, 'Project Submission Info', 0, 500);
}

export function validateAcceptanceCriteria(raw: string): Validation<string> {
  return validateGenericString(raw, 'Acceptance Criteria', 1, 2000);
}

export function validateEvaluationCriteria(raw: string): Validation<string> {
  return validateGenericString(raw, 'Evaluation Criteria', 1, 2000);
}

export function validateAddendumText(raw: string): Validation<string> {
  return validateGenericString(raw, 'Addendum', 1, 5000);
}

export function validateNote(raw: string): Validation<string> {
  return validateGenericString(raw, 'Status Note', 1, 1000);
}
