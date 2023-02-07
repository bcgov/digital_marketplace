import { optional, validateDate, Validation } from "shared/lib/validation";
import { setDateTo4PM } from "shared/lib";

/**
 * Takes a date value, formats it, sets it to 4pm
 * Can replace/same as validateStartDate() and validateAssignmentDate()
 *
 * @param raw - string
 * @param minDate - Date
 */
export function validateDateFormatMinMax(
  raw: string,
  minDate: Date
): Validation<Date> {
  return validateDate(raw, setDateTo4PM(minDate), undefined, setDateTo4PM);
}

/**
 * Takes a date value, (optionally) formats it, sets it to 4pm
 *
 * @param raw - string | undefined
 * @param startDate
 */
export function validateCompletionDate(
  raw: string | undefined,
  startDate: Date
): Validation<Date | undefined> {
  return optional(raw, (v) =>
    validateDate(v, setDateTo4PM(startDate), undefined, setDateTo4PM)
  );
}
