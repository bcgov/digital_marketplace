import { union } from "lodash";
import { getNumber, getString } from "shared/lib";
import {
  MAX_TEAM_QUESTION_WORD_LIMIT,
  SWUOpportunity,
  SWUTeamQuestion
} from "shared/lib/resources/opportunity/sprint-with-us";
import {
  CreateSWUProposalReferenceBody,
  CreateSWUProposalReferenceValidationErrors,
  CreateSWUProposalStatus,
  CreateSWUProposalTeamQuestionResponseBody,
  CreateSWUProposalTeamQuestionResponseValidationErrors,
  parseSWUProposalStatus,
  SWUProposalStatus
} from "shared/lib/resources/proposal/sprint-with-us";
import { User, usersHaveCapability } from "shared/lib/resources/user";
import {
  allValid,
  ArrayValidation,
  getInvalidValue,
  invalid,
  isInvalid,
  valid,
  validateArrayCustom,
  validateEmail,
  validateGenericString,
  validateGenericStringWords,
  validateNumber,
  validateNumberWithPrecision,
  validatePhoneNumber,
  Validation
} from "shared/lib/validation";
import { isArray, isBoolean } from "util";

export function validateSWUProposalStatus(
  raw: string,
  isOneOf: SWUProposalStatus[]
): Validation<SWUProposalStatus> {
  const parsed = parseSWUProposalStatus(raw);
  if (!parsed) {
    return invalid([`"${raw}" is not a valid SprintWithUs proposal status.`]);
  }
  if (!isOneOf.includes(parsed)) {
    return invalid([`"${raw}" is not one of: ${isOneOf.join(", ")}`]);
  }
  return valid(parsed);
}

export function validateCreateSWUProposalStatus(
  raw: string
): Validation<CreateSWUProposalStatus> {
  return validateSWUProposalStatus(raw, [
    SWUProposalStatus.Draft,
    SWUProposalStatus.Submitted
  ]) as Validation<CreateSWUProposalStatus>;
}

export function validateSWUProposalTeamMemberScrumMaster(
  raw: any
): Validation<boolean> {
  return isBoolean(raw)
    ? valid(raw)
    : invalid(["Invalid value provided for scrum master."]);
}

export function validateSWUPhaseProposedCost(
  raw: number,
  phaseMaxBudget: number
): Validation<number> {
  return validateNumber(raw, 0, phaseMaxBudget, "Proposed Cost");
}

export function validateSWUProposalReferenceName(
  raw: string
): Validation<string> {
  return validateGenericString(raw, "Name", 1);
}

export function validateSWUProposalReferenceCompany(
  raw: string
): Validation<string> {
  return validateGenericString(raw, "Company", 1);
}

export function validateSWUProposalReferencePhone(
  raw: string
): Validation<string> {
  return validatePhoneNumber(raw);
}

export function validateSWUProposalReferenceEmail(
  raw: string
): Validation<string> {
  return validateEmail(raw);
}

export function validateSWUProposalReferenceOrder(
  raw: number
): Validation<number> {
  return validateNumber(raw, 0, 2, "Order");
}

export function validateSWUProposalReference(
  raw: any
): Validation<
  CreateSWUProposalReferenceBody,
  CreateSWUProposalReferenceValidationErrors
> {
  const validatedName = validateSWUProposalReferenceName(
    getString(raw, "name")
  );
  const validatedCompany = validateSWUProposalReferenceCompany(
    getString(raw, "company")
  );
  const validatedPhone = validateSWUProposalReferencePhone(
    getString(raw, "phone")
  );
  const validatedEmail = validateSWUProposalReferenceEmail(
    getString(raw, "email")
  );
  const validatedOrder = validateSWUProposalReferenceOrder(
    getNumber(raw, "order")
  );
  if (
    allValid([
      validatedName,
      validatedCompany,
      validatedPhone,
      validatedEmail,
      validatedOrder
    ])
  ) {
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

export function validateSWUProposalReferences(
  raw: any
): ArrayValidation<
  CreateSWUProposalReferenceBody,
  CreateSWUProposalReferenceValidationErrors
> {
  if (!isArray(raw)) {
    return invalid([
      { parseFailure: ["Please provide an array of references."] }
    ]);
  }
  return validateArrayCustom(raw, validateSWUProposalReference, {});
}

export function validateSWUProposalTeamQuestionResponseResponse(
  raw: string,
  wordLimit = MAX_TEAM_QUESTION_WORD_LIMIT
): Validation<string> {
  return validateGenericStringWords(raw, "Response", 1, wordLimit);
}

export function validateSWUProposalTeamQuestionResponseOrder(
  raw: number,
  opportunityTeamQuestions: SWUTeamQuestion[]
): Validation<number> {
  return validateNumber(raw, 0, opportunityTeamQuestions.length, "Order");
}

export function validateSWUProposalTeamQuestionResponse(
  raw: any,
  opportunityTeamQuestions: SWUTeamQuestion[]
): Validation<
  CreateSWUProposalTeamQuestionResponseBody,
  CreateSWUProposalTeamQuestionResponseValidationErrors
> {
  const validatedOrder = validateSWUProposalTeamQuestionResponseOrder(
    getNumber(raw, "order"),
    opportunityTeamQuestions
  );
  if (isInvalid(validatedOrder)) {
    return invalid({
      order: getInvalidValue(validatedOrder, undefined)
    });
  }
  const wordLimit =
    opportunityTeamQuestions.find((q) => q.order === validatedOrder.value)
      ?.wordLimit || null;
  if (!wordLimit) {
    return invalid({
      order: ["No matching opportunity question."]
    });
  }
  const validatedResponse = validateSWUProposalTeamQuestionResponseResponse(
    getString(raw, "response"),
    wordLimit
  );
  if (isInvalid(validatedResponse)) {
    return invalid({
      response: getInvalidValue(validatedResponse, undefined)
    });
  } else {
    return valid({
      response: validatedResponse.value,
      order: validatedOrder.value
    } as CreateSWUProposalTeamQuestionResponseBody);
  }
}

export function validateSWUProposalTeamQuestionResponses(
  raw: any,
  opportunityTeamQuestions: SWUTeamQuestion[]
): ArrayValidation<
  CreateSWUProposalTeamQuestionResponseBody,
  CreateSWUProposalTeamQuestionResponseValidationErrors
> {
  if (!isArray(raw)) {
    return invalid([
      { parseFailure: ["Please provide an array of responses."] }
    ]);
  }
  return validateArrayCustom(
    raw,
    (v) => validateSWUProposalTeamQuestionResponse(v, opportunityTeamQuestions),
    {}
  );
}

export function validateSWUProposalProposedCost(
  inceptionCost: number,
  prototypeCost: number,
  implementationCost: number,
  opportunityBudget: number
): Validation<number> {
  const totalProposedCost = inceptionCost + prototypeCost + implementationCost;
  if (totalProposedCost > opportunityBudget) {
    return invalid([
      "The proposed cost exceeds the maximum budget for this opportunity."
    ]);
  }
  return valid(totalProposedCost);
}

// Given a SWU opportunity and set of Users, validate that the set of capabilities for those users satisfies the requirements of the opportunity
export function validateSWUProposalTeamCapabilities(
  opportunity: SWUOpportunity,
  team: Array<Pick<User, "capabilities">>
): Validation<string[]> {
  const unionedOpportunityCapabilities = union(
    opportunity.inceptionPhase?.requiredCapabilities.map((c) => c.capability) ||
      [],
    opportunity.prototypePhase?.requiredCapabilities.map((c) => c.capability) ||
      [],
    opportunity.implementationPhase.requiredCapabilities.map(
      (c) => c.capability
    )
  );
  if (
    unionedOpportunityCapabilities.every((v) => usersHaveCapability(team, v))
  ) {
    return valid(unionedOpportunityCapabilities);
  } else {
    return invalid([
      "The selected team members for each phase do not satisfy this opportunity's capability requirements."
    ]);
  }
}

export function validateNote(raw: string): Validation<string> {
  return validateGenericString(raw, "Note", 0, 5000);
}

export function validateDisqualificationReason(
  raw: string
): Validation<string> {
  return validateGenericString(raw, "Disqualification Reason", 1, 5000);
}

export function validateCodeChallengeScore(raw: number): Validation<number> {
  return validateNumberWithPrecision(raw, 0, 100, 2, "Code Challenge Score");
}

export function validateTeamScenarioScore(raw: number): Validation<number> {
  return validateNumberWithPrecision(raw, 0, 100, 2, "Team Scenario Score");
}
