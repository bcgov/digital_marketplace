import { uniq } from 'lodash';
import { ArrayValidation, invalid, mapValid, valid, validateArray, validateDate, validateGenericString, validateNumber, Validation } from 'shared/lib/validation';
import { isBoolean } from 'util';

export function validateTitle(raw: string): Validation<string> {
  return validateGenericString(raw, 'Title', 1);
}

export function validateTeaser(raw: string): Validation<string> {
  return validateGenericString(raw, 'Teaser', 1, 500);
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
  const validatedArray = validateArray(raw, v => validateGenericString(v, 'Skill'));
  return mapValid(validatedArray, skills => uniq(skills));
}

export function validateDescription(raw: string): Validation<string> {
  return validateGenericString(raw, 'Description', 1, 10000);
}

export function validateProposalDeadline(raw: string): Validation<Date> {
  return validateDate(raw, new Date());
}

export function validateStartDate(raw: string): Validation<Date> {
  return validateDate(raw, new Date());
}

export function validateAssignmentDate(raw: string): Validation<Date> {
  return validateDate(raw, new Date());
}

export function validateCompletionDate(raw: string): Validation<Date> {
  return validateDate(raw, new Date());
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
