import { invalid, valid, validateArray, validateGenericString, Validation} from 'shared/lib/validation';

export function validateCounterName(raw: string): Validation<string, string[]> {
  const isValid = validateGenericString(raw, 'Counter name') && raw.match(/^[a-zA-Z0-9.-]+$/);
  if (isValid) {
    return valid(raw);
  } else {
    return invalid(['Counter name is not alphanumeric.']);
  }
}

export function validateCounterNames(raw: Record<string, string>): Validation<string[], string[][]> {
  if (!('counters' in raw)) {
    return valid([]); // No query string should return all, so valid
  }
  const names = raw.counters?.split(',');
  return validateArray(names, validateCounterName);
}
