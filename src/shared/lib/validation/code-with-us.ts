import { invalid, isValid, valid, validateArray, validateGenericString, Validation } from 'shared/lib/validation';
import { isBoolean } from 'util';

export { validateDate } from 'shared/lib/validation';

export function validateTitle(raw: string): Validation<string> {
  return validateGenericString(raw, 'Title', 0);
}

export function validateTeaser(raw: string): Validation<string> {
  return validateGenericString(raw, 'Teaser', 0);
}

export function validateRemoteOk(raw: any): Validation<boolean> {
  return isBoolean(raw) ? valid(raw) : invalid(['Invalid remote option provided.']);
}

export function validateRemoteDesc(raw: string): Validation<string> {
  return validateGenericString(raw, 'Remote Description', 0);
}

export function validateLocation(raw: string): Validation<string> {
  return validateGenericString(raw, 'Location', 0);
}

export function validateReward(raw: number): Validation<number> {
  return (raw >= 0 && raw <= 70000) ? valid(raw) : invalid(['Reward not in required range.']);
}

export function validateSkills(raw: string[]): Validation<string[]> {
  const validatedArray = validateArray(raw, v => validateGenericString(v, 'Skill'));
  return isValid(validatedArray) ? validatedArray : invalid(['Invalid skill provided.']);
}

export function validateDescription(raw: string): Validation<string> {
  return validateGenericString(raw, 'Description');
}

export function validateSubmissionInfo(raw: string): Validation<string> {
  return validateGenericString(raw, 'Project Submission Info', 0);
}

export function validateAcceptanceCriteria(raw: string): Validation<string> {
  return validateGenericString(raw, 'Acceptance Criteria', 0);
}

export function validateEvaluationCriteria(raw: string): Validation<string> {
  return validateGenericString(raw, 'Evaluation Criteria', 0);
}

export function validateAddendumText(raw: string): Validation<string> {
  return validateGenericString(raw, 'Addendum');
}

export function validateNote(raw: string): Validation<string> {
  return validateGenericString(raw, 'Status Note', 0);
}
