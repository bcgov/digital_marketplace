import {
  ArrayValidation,
  invalid,
  mapValid,
  optional,
  valid,
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

/**
 * Checks for a string value with a minimum and maximum length
 *
 * @param raw - string, the title
 */
export function validateTitle(raw: string): Validation<string> {
  return validateGenericString(raw, "Title", 1, 200);
}

/**
 * Checks for a string value with a minimum and maximum length
 *
 * @param raw - string, the teaser
 */
export function validateTeaser(raw: string): Validation<string> {
  return validateGenericString(raw, "Teaser", 0, 500);
}

/**
 * Checks if a value is of type boolean
 *
 * @param raw - any
 */
export function validateRemoteOk(raw: any): Validation<boolean> {
  return typeof raw === "boolean"
    ? valid(raw)
    : invalid(["Invalid remote option provided."]);
}

/**
 * Checks for a string value with a maximum length
 * and uses the numeric value of a boolean to set a minimum length
 *
 * @param raw - string, the description
 * @param remoteOk - boolean, remote yes or no
 */
export function validateRemoteDesc(
  raw: string,
  remoteOk: boolean
): Validation<string> {
  return validateGenericString(
    raw,
    "Remote description",
    remoteOk ? 1 : 0,
    500
  );
}

/**
 * Checks for a string value with a minimum and maximum length
 *
 * @param raw - string
 */
export function validateDescription(raw: string): Validation<string> {
  return validateGenericString(raw, "Description", 1, 10000);
}

/**
 * Checks for a string value with a minimum length
 * TODO - make this check against actual locations in the world
 *
 * @param raw - string, Location
 */
export function validateLocation(raw: string): Validation<string> {
  return validateGenericString(raw, "Location", 1);
}
