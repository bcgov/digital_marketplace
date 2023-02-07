import { validateDate, Validation } from "shared/lib/validation";
import { setDateTo4PM } from "shared/lib";

/**
 * Takes a date value, formats it, sets it to 4pm
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
