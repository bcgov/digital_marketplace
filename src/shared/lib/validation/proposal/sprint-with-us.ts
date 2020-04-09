import { spread, union } from 'lodash';
import { getNumber, getString } from 'shared/lib';
import { MAX_TEAM_QUESTION_WORD_LIMIT, MAX_TEAM_QUESTIONS, SWUOpportunity } from 'shared/lib/resources/opportunity/sprint-with-us';
import { CreateSWUProposalReferenceBody, CreateSWUProposalReferenceValidationErrors, CreateSWUProposalStatus, CreateSWUProposalTeamQuestionResponseBody, CreateSWUProposalTeamQuestionResponseValidationErrors, parseSWUProposalStatus, SWUProposalStatus } from 'shared/lib/resources/proposal/sprint-with-us';
import { User } from 'shared/lib/resources/user';
import { allValid, ArrayValidation, getInvalidValue, invalid, valid, validateArrayCustom, validateEmail, validateGenericString, validateNumber, validatePhoneNumber, Validation } from 'shared/lib/validation';
import { isArray, isBoolean } from 'util';

export function validateSWUProposalStatus(raw: string, isOneOf: SWUProposalStatus[]): Validation<SWUProposalStatus> {
  const parsed = parseSWUProposalStatus(raw);
  if (!parsed) { return invalid([`"${raw}" is not a valid SprintWithUs proposal status.`]); }
  if (!isOneOf.includes(parsed)) {
    return invalid([`"${raw}" is not one of: ${isOneOf.join(', ')}`]);
  }
  return valid(parsed);
}

export function validateCreateSWUProposalStatus(raw: string): Validation<CreateSWUProposalStatus> {
  return validateSWUProposalStatus(raw, [SWUProposalStatus.Draft, SWUProposalStatus.Submitted]) as Validation<CreateSWUProposalStatus>;
}

export function validateSWUProposalTeamMemberScrumMaster(raw: any): Validation<boolean> {
  return isBoolean(raw) ? valid(raw) : invalid(['Invalid value provided for scrum master.']);
}

export function validateSWUPhaseProposedCost(raw: number, phaseMaxBudget: number): Validation<number> {
  return validateNumber(raw, 0, phaseMaxBudget, 'Proposed Cost');
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

export function validateSWUProposalProposedCost(inceptionCost: number, prototypeCost: number, implementationCost: number, opportunityBudget: number): Validation<number> {
  const totalProposedCost = inceptionCost + prototypeCost + implementationCost;
  if (totalProposedCost > opportunityBudget) {
    return invalid(['The proposed cost exceeds the maximum budget for this opportunity.']);
  }
  return valid(totalProposedCost);
}

// Given a SWU opportunity and set of Users, validate that the set of capabilities for those users satisfies the requirements of the opportunity
export function validateSWUProposalTeamCapabilities(opportunity: SWUOpportunity, team: User[]): Validation<string[]> {
  const unionedUserCapabilities = spread<string[]>(union)(team.map(m => m.capabilities));
  const unionedOpportunityCapabilities = union(
    (opportunity.inceptionPhase?.requiredCapabilities.map(c => c.capability) || []),
    (opportunity.prototypePhase?.requiredCapabilities.map(c => c.capability) || []),
    opportunity.implementationPhase.requiredCapabilities.map(c => c.capability)
  );

  if (unionedOpportunityCapabilities.every(v => unionedUserCapabilities.includes(v))) {
    return valid(unionedUserCapabilities);
  } else {
    return invalid(['The selected team members for each phase do not satisfy this opportunity\'s capability requirements.']);
  }
}

export function validateNote(raw: string): Validation<string> {
  return validateGenericString(raw, 'Note', 0, 5000);
}

export function validateTeamQuestionsScore(raw: number, opportunityScoreWeight: number): Validation<number> {
  return validateNumber(raw, 0, opportunityScoreWeight, 'Team Questions Score');
}

export function validateCodeChallengeScore(raw: number, opportunityScoreWeight: number): Validation<number> {
  return validateNumber(raw, 0, opportunityScoreWeight, 'Code Challenge Score');
}

export function validateTeamScenarioScore(raw: number, opportunityScoreWeight: number): Validation<number> {
  return validateNumber(raw, 0, opportunityScoreWeight, 'Team Scenario Score');
}
