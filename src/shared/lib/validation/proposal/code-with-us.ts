import { CreateIndividualProponentRequestBody, CreateIndividualProponentValidationErrors } from 'shared/lib/resources/proposal/code-with-us';
import { allValid, getInvalidValue, invalid, optional, valid, validateGenericString, validatePhoneNumber, Validation } from 'shared/lib/validation';

export function validateProposalText(raw: string): Validation<string> {
  return validateGenericString(raw, 'Proposal Text', 0);
}

export function validateAdditionalComments(raw: string): Validation<string> {
  return validateGenericString(raw, 'Additional Comments', 0);
}

export function validateIndividualProponent(raw: any): Validation<CreateIndividualProponentRequestBody, CreateIndividualProponentValidationErrors> {
  const { legalName, email, phone, street1, street2, city, region, mailCode, country } = raw;
  const validatedLegalName = validateGenericString(legalName, 'Legal Name');
  const validatedEmail = validateGenericString(email, 'Email');
  const validatedPhone = optional(phone, v => validatePhoneNumber(v));
  const validatedStreet1 = validateGenericString(street1, 'Street Address');
  const validatedStreet2 = optional(street2, v => validateGenericString(v, 'Street Address'));
  const validatedCity = validateGenericString(city, 'City');
  const validatedRegion = validateGenericString(region, 'Province/State');
  const validatedMailCode = validateGenericString(mailCode, 'Postal/Zip Code');
  const validatedCountry  = validateGenericString(country, 'Country');

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
