import { validateGenericString, Validation } from 'shared/lib/validation';

export function validateSlug(raw: string): Validation<string> {
  return validateGenericString(raw, 'Slug', 1);
}

export function validateTitle(raw: string): Validation<string> {
  return validateGenericString(raw, 'Title', 1);
}

export function validateBody(raw: string): Validation<string> {
  return validateGenericString(raw, 'Body', 1);
}
