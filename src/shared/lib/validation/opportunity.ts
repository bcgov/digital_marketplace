import { validateGenericString, Validation } from 'shared/lib/validation';

export function validateTitle(raw: string): Validation<string> {
  return validateGenericString(raw, 'Title');
}
