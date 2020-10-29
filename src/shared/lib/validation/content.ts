import { invalid, valid, validateGenericString, Validation } from 'shared/lib/validation';
import { isBoolean } from 'util';

export function validateTitle(raw: string): Validation<string> {
  return validateGenericString(raw, 'Title', 1);
}

export function validateBody(raw: string): Validation<string> {
  return validateGenericString(raw, 'Body', 1);
}

export function validateFixed(raw: any): Validation<boolean> {
  return isBoolean(raw) ? valid(raw) : invalid(['Invalid value for fixed provided.']);
}

export function validateSlug(raw: string): Validation<string> {
  if (!raw.match(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)) {
    return invalid([ 'Please enter a valid slug.' ]);
  } else {
    return valid(raw);
  }
}