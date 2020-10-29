import { invalid, valid, validateGenericString, Validation } from 'shared/lib/validation';
import { isBoolean } from 'util';

export function validateSlug(raw: string): Validation<string> {
  return validateGenericString(raw, 'Slug', 1);
}

export function validateTitle(raw: string): Validation<string> {
  return validateGenericString(raw, 'Title', 1);
}

export function validateBody(raw: string): Validation<string> {
  return validateGenericString(raw, 'Body', 1);
}

export function validateFixed(raw: any): Validation<boolean> {
  return isBoolean(raw) ? valid(raw) : invalid(['Invalid value for fixed provided.']);
}
