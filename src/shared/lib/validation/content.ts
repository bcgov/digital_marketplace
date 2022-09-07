import {
  invalid,
  valid,
  validateGenericString,
  Validation
} from "shared/lib/validation";

export function validateTitle(raw: string): Validation<string> {
  return validateGenericString(raw, "Title", 1, 100);
}

export function validateBody(raw: string): Validation<string> {
  return validateGenericString(raw, "Body", 1, 50000);
}

export function validateSlug(raw: string): Validation<string> {
  if (!raw.match(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)) {
    return invalid(["Please enter a valid slug."]);
  } else {
    return valid(raw);
  }
}
