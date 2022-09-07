import {
  invalid,
  valid,
  validateArray,
  validateGenericString,
  Validation
} from "shared/lib/validation";

export function validateCounterName(raw: string): Validation<string, string[]> {
  const isValid =
    validateGenericString(raw, "Counter name") && raw.match(/^[a-zA-Z0-9.-]+$/);
  if (isValid) {
    return valid(raw);
  } else {
    return invalid(["Counter name is not alphanumeric."]);
  }
}

export function validateCounterNames(
  raw: string[]
): Validation<string[], string[][]> {
  return validateArray(raw, validateCounterName);
}
