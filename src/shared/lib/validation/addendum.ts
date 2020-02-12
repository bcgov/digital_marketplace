import { Validation, validateGenericString } from 'shared/lib/validation';

export function validateAddendumText(raw: string): Validation<string> {
  return validateGenericString(raw, 'Addendum', 1, 5000);
}
