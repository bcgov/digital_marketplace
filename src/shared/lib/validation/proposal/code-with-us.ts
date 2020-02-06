import { getString } from 'shared/lib';
import { CreateIndividualProponentRequestBody, CreateIndividualProponentValidationErrors } from 'shared/lib/resources/proposal/code-with-us';
import { allValid, getInvalidValue, invalid, optional, valid, validateGenericString, validatePhoneNumber, Validation } from 'shared/lib/validation';

export function validateProposalText(raw: string): Validation<string> {
  return validateGenericString(raw, 'Proposal Text', 0);
}

export function validateAdditionalComments(raw: string): Validation<string> {
  return validateGenericString(raw, 'Additional Comments', 0);
}

export function validateNote(raw: string): Validation<string> {
  return validateGenericString(raw, 'Note', 0);
}

export function validateScore(raw: number): Validation<number> {
  return raw >= 0 ? valid(raw) : invalid(['Score not in valid range.']);
}

export function validateIndividualProponent(raw: any): Validation<CreateIndividualProponentRequestBody, CreateIndividualProponentValidationErrors> {
  const validatedLegalName = validateGenericString(getString(raw, 'legalName'), 'Legal Name');
  const validatedEmail = validateGenericString(getString(raw, 'email'), 'Email');
  const validatedPhone = optional(getString(raw, 'phone'), v => validatePhoneNumber(v));
  const validatedStreet1 = validateGenericString(getString(raw, 'street1'), 'Street Address');
  const validatedStreet2 = optional(getString(raw, 'street2'), v => validateGenericString(v, 'Street Address'));
  const validatedCity = validateGenericString(getString(raw, 'city'), 'City');
  const validatedRegion = validateGenericString(getString(raw, 'region'), 'Province/State');
  const validatedMailCode = validateGenericString(getString(raw, 'mailCode'), 'Postal/Zip Code');
  const validatedCountry  = validateGenericString(getString(raw, 'country'), 'Country');

  if (allValid([
    validatedLegalName,
    validatedEmail,
    validatedPhone,
    validatedStreet1,
    validatedStreet2,
    validatedCity,
    validatedRegion,
    validatedMailCode,
    validatedCountry
  ])) {
    return valid({
      legalName: validatedLegalName.value,
      email: validatedEmail.value,
      phone: validatedPhone.value,
      street1: validatedStreet1.value,
      street2: validatedStreet2.value,
      city: validatedCity.value,
      region: validatedRegion.value,
      mailCode: validatedMailCode.value,
      country: validatedCountry.value
    } as CreateIndividualProponentRequestBody);
  } else {
    return invalid({
      legalName: getInvalidValue(validatedLegalName, undefined),
      email: getInvalidValue(validatedEmail, undefined),
      phone: getInvalidValue(validatedPhone, undefined),
      street1: getInvalidValue(validatedStreet1, undefined),
      street2: getInvalidValue(validatedStreet2, undefined),
      city: getInvalidValue(validatedCity, undefined),
      region: getInvalidValue(validatedRegion, undefined),
      mailCode: getInvalidValue(validatedMailCode, undefined),
      country: getInvalidValue(validatedCountry, undefined)
    });
  }
}
