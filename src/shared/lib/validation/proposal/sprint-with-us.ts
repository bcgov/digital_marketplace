import { getNumber, getString } from 'shared/lib';
import { MAX_TEAM_QUESTION_WORD_LIMIT, MAX_TEAM_QUESTIONS } from 'shared/lib/resources/opportunity/sprint-with-us';
import { CreateSWUProposalReferenceBody, CreateSWUProposalReferenceValidationErrors, CreateSWUProposalTeamQuestionResponseBody, CreateSWUProposalTeamQuestionResponseValidationErrors, parseSWUProposalStatus, SWUProposalStatus } from 'shared/lib/resources/proposal/sprint-with-us';
import { allValid, ArrayValidation, getInvalidValue, invalid, valid, validateArrayCustom, validateEmail, validateGenericString, validateNumber, validatePhoneNumber, Validation } from 'shared/lib/validation';
import { isArray } from 'util';

export function validateSWUProposalStatus(raw: string, isOneOf: SWUProposalStatus[]): Validation<SWUProposalStatus> {
  const parsed = parseSWUProposalStatus(raw);
  if (!parsed) { return invalid([`"${raw}" is not a valid SprintWithUs proposal status.`]); }
  if (!isOneOf.includes(parsed)) {
    return invalid([`"${raw}" is not one of: ${isOneOf.join(', ')}`]);
  }
  return valid(parsed);
}

export function validateSWUProposalReferenceName(raw: string): Validation<string> {
  return validateGenericString(raw, 'Name', 1);
}

export function validateSWUProposalReferenceCompany(raw: string): Validation<string> {
  return validateGenericString(raw, 'Company', 1);
}

export function validateSWUProposalReferencePhone(raw: string): Validation<string> {
  return validatePhoneNumber(raw);
}

export function validateSWUProposalReferenceEmail(raw: string): Validation<string> {
  return validateEmail(raw);
}

export function validateSWUProposalReferenceOrder(raw: number): Validation<number> {
  return validateNumber(raw, 1, 3, 'Order');
}

export function validateSWUProposalReference(raw: any): Validation<CreateSWUProposalReferenceBody, CreateSWUProposalReferenceValidationErrors> {
  const validatedName = validateSWUProposalReferenceName(getString(raw, 'name'));
  const validatedCompany = validateSWUProposalReferenceCompany(getString(raw, 'company'));
  const validatedPhone = validateSWUProposalReferencePhone(getString(raw, 'phone'));
  const validatedEmail = validateSWUProposalReferenceEmail(getString(raw, 'email'));
  const validatedOrder = validateSWUProposalReferenceOrder(getNumber(raw, 'order'));
  if (allValid([
    validatedName,
    validatedCompany,
    validatedPhone,
    validatedEmail,
    validatedOrder
  ])) {
    return valid({
      name: validatedName.value,
      company: validatedCompany.value,
      phone: validatedPhone.value,
      email: validatedEmail.value,
      order: validatedOrder.value
    } as CreateSWUProposalReferenceBody);
  } else {
    return invalid({
      name: getInvalidValue(validatedName, undefined),
      company: getInvalidValue(validatedCompany, undefined),
      phone: getInvalidValue(validatedPhone, undefined),
      email: getInvalidValue(validatedEmail, undefined),
      order: getInvalidValue(validatedOrder, undefined)
    });
  }
}

export function validateSWUProposalReferences(raw: any): ArrayValidation<CreateSWUProposalReferenceBody, CreateSWUProposalReferenceValidationErrors> {
  if (!isArray(raw)) { return invalid([{ parseFailure: ['Please provide an array of references.'] }]); }
  return validateArrayCustom(raw, validateSWUProposalReference, {});
}

// TODO validate word limit
export function validateSWUProposalTeamQuestionResponseResponse(raw: string, wordLimit = MAX_TEAM_QUESTION_WORD_LIMIT): Validation<string> {
  return validateGenericString(raw, 'Response', 1);
}

export function validateSWUProposalTeamQuestionResponseOrder(raw: number): Validation<number> {
  return validateNumber(raw, 1, MAX_TEAM_QUESTIONS, 'Order');
}

export function validateSWUProposalTeamQuestionResponse(raw: any): Validation<CreateSWUProposalTeamQuestionResponseBody, CreateSWUProposalTeamQuestionResponseValidationErrors> {
  const validatedResponse = validateSWUProposalTeamQuestionResponseResponse(getString(raw, 'response'));
  const validatedOrder = validateSWUProposalTeamQuestionResponseOrder(getNumber(raw, 'order'));
  if (allValid([validatedResponse, validatedOrder])) {
    return valid({
      response: validatedResponse.value,
      order: validatedOrder.value
    } as CreateSWUProposalTeamQuestionResponseBody);
  } else {
    return invalid({
      response: getInvalidValue(validatedResponse, undefined),
      order: getInvalidValue(validatedOrder, undefined)
    });
  }
}

export function validateSWUProposalTeamQuestionResponses(raw: any): ArrayValidation<CreateSWUProposalTeamQuestionResponseBody, CreateSWUProposalTeamQuestionResponseValidationErrors> {
  if (!isArray(raw)) { return invalid([{ parseFailure: ['Please provide an array of responses.'] }]); }
  return validateArrayCustom(raw, validateSWUProposalTeamQuestionResponse, {});
}
