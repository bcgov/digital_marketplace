import {
  optional,
  validateEmail,
  validateGenericString,
  validatePhoneNumber,
  validateUrl,
  Validation
} from "shared/lib/validation";

export function validateLegalName(raw: string): Validation<string> {
  return validateGenericString(raw, "Legal Name");
}

export function validateWebsiteUrl(
  raw: string | undefined
): Validation<string | undefined> {
  return optional(raw, validateUrl);
}

export function validateStreetAddress1(raw: string): Validation<string> {
  return validateGenericString(raw, "Street Address");
}

export function validateStreetAddress2(
  raw: string | undefined
): Validation<string | undefined> {
  return optional(raw, (v) => validateGenericString(v, "Street Address"));
}

export function validateCity(raw: string): Validation<string> {
  return validateGenericString(raw, "City");
}

export function validateRegion(raw: string): Validation<string> {
  return validateGenericString(raw, "Region");
}

export function validateMailCode(raw: string): Validation<string> {
  return validateGenericString(raw, "Mail Code");
}

export function validateCountry(raw: string): Validation<string> {
  return validateGenericString(raw, "Country");
}

export function validateContactName(raw: string): Validation<string> {
  return validateGenericString(raw, "Contact Name");
}

export function validateContactTitle(
  raw: string | undefined
): Validation<string | undefined> {
  return optional(raw, (v) => validateGenericString(v, "Contact Title"));
}

export function validateContactEmail(raw: string): Validation<string> {
  return validateEmail(raw);
}

export function validateContactPhone(
  raw: string | undefined
): Validation<string | undefined> {
  return optional(raw, validatePhoneNumber);
}
