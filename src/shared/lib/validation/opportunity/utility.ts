import {
  ArrayValidation,
  invalid,
  mapValid,
  optional,
  validateArray,
  validateDate,
  validateGenericString,
  Validation
} from "shared/lib/validation";
import { setDateTo4PM } from "shared/lib";
import { uniq } from "lodash";

/**
 * Use this file for (validation) functions that can be used across opportunities
 * instead of duplicating unnecessarily.
 */

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

/**
 *
 * @param raw - string[] an array of strings
 */
export function validateMandatorySkills(
  raw: string[]
): ArrayValidation<string> {
  if (!raw.length) {
    return invalid([["Please select at least one skill."]]);
  }
  const validatedArray = validateArray(raw, (v) =>
    validateGenericString(v, "Mandatory Skill", 1, 100)
  );
  return mapValid<string[], string[][], string[]>(validatedArray, (skills) =>
    uniq(skills)
  );
}
