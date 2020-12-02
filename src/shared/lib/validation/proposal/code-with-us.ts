import { getNumber, getString } from 'shared/lib';
import { CreateIndividualProponentRequestBody, CreateIndividualProponentValidationErrors, CWUProposalStatus, parseCWUProposalStatus, UpdateProposalScoreBody, UpdateProposalScoreValidationErrors } from 'shared/lib/resources/proposal/code-with-us';
import { allValid, getInvalidValue, invalid, mapValid, optional, valid, validateEmail, validateGenericString, validateNumberWithPrecision, validatePhoneNumber, Validation } from 'shared/lib/validation';

export function validateCWUProposalStatus(raw: string, isOneOf: CWUProposalStatus[]): Validation<CWUProposalStatus> {
  const parsed = parseCWUProposalStatus(raw);
  if (!parsed) { return invalid([`"${raw}" is not a valid CodeWithUs proposal status.`]); }
  if (!isOneOf.includes(parsed)) {
    return invalid([`"${raw}" is not one of: ${isOneOf.join(', ')}`]);
  }
  return valid(parsed);
}

export function validateProposalText(raw: string): Validation<string> {
  return validateGenericString(raw, 'Proposal Text', 1, 10000);
}

export function validateAdditionalComments(raw: string): Validation<string> {
  return validateGenericString(raw, 'Additional Comments', 0, 10000);
}

export function validateNote(raw: string): Validation<string> {
  return validateGenericString(raw, 'Note', 0, 5000);
}

export function validateDisqualificationReason(raw: string): Validation<string> {
  return validateGenericString(raw, 'Disqualification Reason', 1, 5000);
}

export function validateScore(raw: number): Validation<number> {
  return validateNumberWithPrecision(raw, 0, 100, 2, 'score', 'a', false);
}

export function validateIndividualProponentLegalName(raw: string): Validation<string> {
  return validateGenericString(raw, 'Legal Name', 1);
}

export function validateIndividualProponentEmail(raw: string): Validation<string> {
  return validateEmail(raw);
}

export function validateIndividualProponentPhone(raw: string | undefined): Validation<string> {
  return mapValid(optional(raw, v => validatePhoneNumber(v)), w => w || '');
}

export function validateIndividualProponentStreet1(raw: string): Validation<string> {
  return validateGenericString(raw, 'Street Address', 1);
}

export function validateIndividualProponentStreet2(raw: string): Validation<string> {
  return validateGenericString(raw, 'Street Address', 0);
}

export function validateIndividualProponentCity(raw: string): Validation<string> {
  return validateGenericString(raw, 'City', 1);
}

export function validateIndividualProponentRegion(raw: string): Validation<string> {
  return validateGenericString(raw, 'Province/State', 1);
}

export function validateIndividualProponentMailCode(raw: string): Validation<string> {
  return validateGenericString(raw, 'Postal/Zip Code', 1);
}

export function validateIndividualProponentCountry(raw: string): Validation<string> {
  return validateGenericString(raw, 'Country', 1);
}

export function validateIndividualProponent(raw: any): Validation<CreateIndividualProponentRequestBody, CreateIndividualProponentValidationErrors> {
  const validatedLegalName = validateIndividualProponentLegalName(getString(raw, 'legalName'));
  const validatedEmail = validateIndividualProponentEmail(getString(raw, 'email'));
  const validatedPhone = optional(getString(raw, 'phone'), validateIndividualProponentPhone);
  const validatedStreet1 = validateIndividualProponentStreet1(getString(raw, 'street1'));
  const validatedStreet2 = optional(getString(raw, 'street2'), validateIndividualProponentStreet2);
  const validatedCity = validateIndividualProponentCity(getString(raw, 'city'));
  const validatedRegion = validateIndividualProponentRegion(getString(raw, 'region'));
  const validatedMailCode = validateIndividualProponentMailCode(getString(raw, 'mailCode'));
  const validatedCountry  = validateIndividualProponentCountry(getString(raw, 'country'));

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

export function validateUpdateProposalScoreBody(raw: any): Validation<UpdateProposalScoreBody, UpdateProposalScoreValidationErrors> {
  const validatedNote = validateNote(getString(raw, 'note'));
  const validatedScore = validateScore(getNumber(raw, 'score', -1, false));
  if (allValid([validatedNote, validatedScore])) {
    return valid({
      note: validatedNote.value,
      score: validatedScore.value
    } as UpdateProposalScoreBody);
  } else {
    return invalid({
      note: getInvalidValue(validatedNote, undefined),
      score: getInvalidValue(validatedScore, undefined)
    });
  }
}
