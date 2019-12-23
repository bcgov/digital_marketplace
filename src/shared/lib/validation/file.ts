import { validateGenericString, Validation } from 'shared/lib/validation';

export function validateFileName(name: string): Validation<string> {
  return validateGenericString(name, 'File name');
}
