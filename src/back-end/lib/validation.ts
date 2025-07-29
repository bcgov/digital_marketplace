import { Content } from "shared/lib/resources/content";
import * as db from "back-end/lib/db";
import { get, union, uniqBy } from "lodash";
import { getNumber, getString, getStringArray } from "shared/lib";
import {
  Affiliation,
  MembershipStatus
} from "shared/lib/resources/affiliation";
import { FileRecord } from "shared/lib/resources/file";
import { CWUOpportunity } from "shared/lib/resources/opportunity/code-with-us";
import {
  CreateSWUEvaluationPanelMemberBody,
  CreateSWUEvaluationPanelMemberValidationErrors,
  SWUOpportunity,
  SWUOpportunityPhase
} from "shared/lib/resources/opportunity/sprint-with-us";
import { Organization } from "shared/lib/resources/organization";
import {
  CreateProponentRequestBody,
  CreateProponentValidationErrors,
  CWUProposal
} from "shared/lib/resources/proposal/code-with-us";
import {
  CreateSWUProposalPhaseBody,
  CreateSWUProposalPhaseValidationErrors,
  CreateSWUProposalTeamMemberBody,
  CreateSWUProposalTeamMemberValidationErrors,
  SWUProposal
} from "shared/lib/resources/proposal/sprint-with-us";
import { AuthenticatedSession, Session } from "shared/lib/resources/session";
import {
  isPublicSectorEmployee,
  User,
  UserType
} from "shared/lib/resources/user";
import { adt, Id } from "shared/lib/types";
import {
  allValid,
  ArrayValidation,
  getInvalidValue,
  getValidValue,
  invalid,
  isInvalid,
  isValid,
  optionalAsync,
  valid,
  validateArrayAsync,
  validateArrayCustomAsync,
  validateGenericString,
  validateUUID,
  Validation
} from "shared/lib/validation";
import { validateIndividualProponent } from "shared/lib/validation/proposal/code-with-us";
import {
  validateSWUPhaseProposedCost,
  validateSWUProposalTeamCapabilities,
  validateSWUProposalTeamMemberScrumMaster
} from "shared/lib/validation/proposal/sprint-with-us";
import {
  CreateTWUEvaluationPanelMemberBody,
  CreateTWUEvaluationPanelMemberValidationErrors,
  CreateTWUResourceBody,
  CreateTWUResourceValidationErrors,
  parseTWUServiceArea,
  TWUOpportunity,
  ValidatedCreateTWUResourceBody
} from "shared/lib/resources/opportunity/team-with-us";
import {
  CreateTWUProposalTeamMemberBody,
  CreateTWUProposalTeamMemberValidationErrors,
  TWUProposal
} from "shared/lib/resources/proposal/team-with-us";
import { validateTWUHourlyRate } from "shared/lib/validation/proposal/team-with-us";
import { ServiceAreaId } from "shared/lib/resources/service-area";
import {
  validateTargetAllocation,
  validateOrder
} from "shared/lib/validation/opportunity/team-with-us";
import {
  validateMandatorySkills,
  validateOptionalSkills
} from "shared/lib/validation/opportunity/utility";
import {
  MIN_SWU_EVALUATION_PANEL_MEMBERS,
  MIN_TWU_EVALUATION_PANEL_MEMBERS
} from "shared/config";
import {
  validateEvaluationPanelMemberChair,
  validateEvaluationPanelMemberEvaluator
} from "shared/lib/validation/opportunity/utility";
import { SWUTeamQuestionResponseEvaluation } from "shared/lib/resources/evaluations/sprint-with-us/team-questions";
import { TWUResourceQuestionResponseEvaluation } from "shared/lib/resources/evaluations/team-with-us/resource-questions";

/**
 * TWU - Team With Us Validation
 */

/**
 * Checks to see if the proposalId passed matches the expected regex pattern of
 * a UUID for proposals, that the request is coming from an authenticated user
 * and that the proposal exists in the db
 *
 * @param connection
 * @param proposalId
 * @param session
 */
export async function validateTWUProposalId(
  connection: db.Connection,
  proposalId: Id,
  session: AuthenticatedSession
): Promise<Validation<TWUProposal>> {
  try {
    const validatedId = validateUUID(proposalId);
    if (isInvalid(validatedId)) {
      return validatedId;
    }
    const dbResult = await db.readOneTWUProposal(
      connection,
      proposalId,
      session
    );
    if (isInvalid(dbResult)) {
      return invalid([db.ERROR_MESSAGE]);
    }
    const proposal = dbResult.value;
    if (!proposal) {
      return invalid(["The specified proposal was not found."]);
    }
    return valid(proposal);
  } catch (exception) {
    return invalid(["Please select a valid proposal."]);
  }
}

/**
 * Checks that a TWU OpportunityId reflects something that lives in the db
 *
 * @param connection
 * @param opportunityId
 * @param session
 */
export async function validateTWUOpportunityId(
  connection: db.Connection,
  opportunityId: Id,
  session: Session
): Promise<Validation<TWUOpportunity>> {
  try {
    const validatedId = validateUUID(opportunityId);
    if (isInvalid(validatedId)) {
      return validatedId;
    }
    const dbResult = await db.readOneTWUOpportunity(
      connection,
      opportunityId,
      session
    );
    if (isInvalid(dbResult)) {
      return invalid([db.ERROR_MESSAGE]);
    }
    const opportunity = dbResult.value;
    if (!opportunity) {
      return invalid(["The specified Team With Us opportunity was not found."]);
    }
    return valid(opportunity);
  } catch (exception) {
    return invalid(["Please select a valid Team With Us opportunity."]);
  }
}

/**
 * Takes one string and proves that it as a valid TWU service area in the db.
 *
 * @param raw - string argument
 * @param connection - Knex connection wrapper
 * @returns Validation - valid serviceAreaId (key value) | invalid string (error messages)
 *
 * @example
 * raw = "FULL_STACK_DEVELOPER"
 * returns
 * {
 *   tag: "valid",
 *   value: 1
 * }
 * or
 * {
 *   tag: "invalid",
 *   value: ["The specified service area was not found"]
 * }
 */
export async function validateServiceArea(
  connection: db.Connection,
  raw: string
): Promise<Validation<ServiceAreaId>> {
  const parsed = parseTWUServiceArea(raw);
  if (!parsed) {
    return invalid([`"${raw}" is not a valid service area.`]);
  }
  try {
    const dbResult = await db.readOneServiceAreaByServiceArea(
      connection,
      parsed
    );
    if (isInvalid(dbResult)) {
      return invalid([db.ERROR_MESSAGE]);
    }
    const serviceArea = dbResult.value;
    if (serviceArea) {
      return valid(serviceArea);
    } else {
      return invalid(["The specified service area was not found."]);
    }
  } catch (e) {
    return invalid(["Please specify a valid service area."]);
  }
}

/**
 * Takes a list of service areas and proves that each of them exists in the db.
 *
 * @param raw - string array argument
 * @param connection - Knex connection wrapper
 * @returns ArrayValidation - valid [array of integers] reflecting key values of serviceArea | invalid [array of
 * strings] reflecting error messages
 *
 * @example
 * raw = ["FULL_STACK_DEVELOPER", "DATA_PROFESSIONAL"]
 * returns
 * {
 *   tag: "valid",
 *   value: [1,2]
 * }
 * or
 * raw = ["FULL_STACK_DEVELOPER", "DATA_PROFESSIONAL, "NOT_A_SERVICE_AREA"]
 *{
 *   tag: "invalid",
 *   value:
 *   [
 *    [],
 *    [],
 *    ['"NOT_A_SERVICE_AREA" is not a valid service area.' ]
 *   ]
 * }
 */
export function validateServiceAreas(
  connection: db.Connection,
  raw: string[]
): Promise<ArrayValidation<ServiceAreaId>> {
  return validateArrayAsync(raw, (v) => validateServiceArea(connection, v));
}

/**
 * Takes a resource and validates it.
 *
 * @param connection
 * @param raw
 * @returns Validation - valid ValidatedCreateTWUResourceBody | invalid CreateTWUResourceValidationErrors
 */
async function validateTWUResource(
  connection: db.Connection,
  raw: CreateTWUResourceBody
): Promise<
  Validation<ValidatedCreateTWUResourceBody, CreateTWUResourceValidationErrors>
> {
  const validatedServiceArea = await validateServiceArea(
    connection,
    getString(raw, "serviceArea")
  );
  const validatedTargetAllocation = validateTargetAllocation(
    getNumber(raw, "targetAllocation")
  );
  const validatedOrder = validateOrder(getNumber(raw, "order"));

  const validatedMandatorySkills = validateMandatorySkills(
    getStringArray(raw, "mandatorySkills")
  );
  const validatedOptionalSkills = validateOptionalSkills(
    getStringArray(raw, "optionalSkills")
  );
  if (
    allValid([
      validatedServiceArea,
      validatedTargetAllocation,
      validatedMandatorySkills,
      validatedOptionalSkills,
      validatedOrder
    ])
  ) {
    return valid({
      serviceArea: validatedServiceArea.value,
      targetAllocation: validatedTargetAllocation.value,
      mandatorySkills: validatedMandatorySkills.value,
      optionalSkills: validatedOptionalSkills.value,
      order: validatedOrder.value
    } as ValidatedCreateTWUResourceBody);
  } else {
    return invalid({
      serviceArea: getInvalidValue(validatedServiceArea, undefined),
      targetAllocation: getInvalidValue(validatedTargetAllocation, undefined),
      mandatorySkills: getInvalidValue<string[][], undefined>(
        validatedMandatorySkills,
        undefined
      ),
      optionalSkills: getInvalidValue<string[][], undefined>(
        validatedOptionalSkills,
        undefined
      ),
      order: getInvalidValue(validatedOrder, undefined)
    } as CreateTWUResourceValidationErrors);
  }
}

/**
 * Takes a list of resources and validates each one.
 *
 * @param connection
 * @param raw
 * @returns ArrayValidation - valid [array of ValidatedCreateTWUResourceBody] | invalid [array of
 * CreateTWUResourceValidationErrors]
 */
export async function validateTWUResources(
  connection: db.Connection,
  raw: CreateTWUResourceBody[]
): Promise<
  ArrayValidation<
    ValidatedCreateTWUResourceBody,
    CreateTWUResourceValidationErrors
  >
> {
  if (!Array.isArray(raw)) {
    return invalid([
      { parseFailure: ["Please provide an array of resources"] }
    ]);
  }

  return await validateArrayCustomAsync(
    raw,
    (v) => validateTWUResource(connection, v),
    {}
  );
}

/**
 * Helper function to determine if an array has duplicate values
 *
 * @param arr
 * @returns boolean - true if there are duplicate values, false otherwise.
 */
function hasDuplicates(arr: string[]): boolean {
  return new Set(arr).size < arr.length;
}

/**
 * Checks to see if a TWU proposal's members are affiliated with the
 * organization in the proposal
 *
 * @param connection - database connection
 * @param raw - a 'team' object, with 'member', 'hourlyRate' and 'resource' elements
 * @param organization - organization id
 */
export async function validateTWUProposalTeamMembers(
  connection: db.Connection,
  raw: CreateTWUProposalTeamMemberBody[],
  organization: Id
): Promise<
  ArrayValidation<
    CreateTWUProposalTeamMemberBody,
    CreateTWUProposalTeamMemberValidationErrors
  >
> {
  if (!raw.length) {
    return invalid([{ members: ["Please select at least one team member."] }]);
  }
  // ensure that all member values are unique
  if (hasDuplicates(raw.map((v) => getString(v, "member")))) {
    return invalid([{ members: ["Please select unique team members."] }]);
  }
  return await validateArrayCustomAsync(
    raw,
    async (rawMember) => {
      const validatedMember = await validateMember(
        connection,
        getString(rawMember, "member"),
        organization
      );
      const validatedHourlyRate = validateTWUHourlyRate(
        getNumber<number>(rawMember, "hourlyRate")
      );
      const validatedResource = getValidValue(
        await db.readOneResource(connection, getString(rawMember, "resource")),
        null
      );
      if (
        isValid(validatedMember) &&
        isValid(validatedHourlyRate) &&
        validatedResource
      ) {
        return valid({
          member: validatedMember.value.id,
          hourlyRate: validatedHourlyRate.value,
          resource: validatedResource.id
        });
      } else {
        return invalid({
          member: getInvalidValue<string[], undefined>(
            validatedMember,
            undefined
          ),
          hourlyRate: getInvalidValue(validatedHourlyRate, undefined),
          resource: ["This resource cannot be found."]
        }) as Validation<
          CreateTWUProposalTeamMemberBody,
          CreateTWUProposalTeamMemberValidationErrors
        >;
      }
    },
    {}
  );
}

async function validateTWUEvaluationPanelMember(
  connection: db.Connection,
  raw: any
): Promise<
  Validation<
    CreateTWUEvaluationPanelMemberBody,
    CreateTWUEvaluationPanelMemberValidationErrors
  >
> {
  let validatedUser = await validateUserId(connection, getString(raw, "user"));
  const validaValidatedUser = getValidValue(validatedUser, null);
  if (validaValidatedUser && !isPublicSectorEmployee(validaValidatedUser)) {
    validatedUser = invalid(["The user must be a public sector employee."]);
  }
  const validatedEvaluator = validateEvaluationPanelMemberEvaluator(
    get(raw, "evaluator")
  );
  const validatedChair = validateEvaluationPanelMemberChair(get(raw, "chair"));
  const validatedOrder = validateOrder(getNumber(raw, "order"));

  if (
    allValid([
      validatedUser,
      validatedEvaluator,
      validatedChair,
      validatedOrder
    ])
  ) {
    return valid({
      evaluator: validatedEvaluator.value,
      chair: validatedChair.value,
      user: (validatedUser.value as User).id,
      order: validatedOrder.value
    } as CreateTWUEvaluationPanelMemberBody);
  } else {
    return invalid({
      user: getInvalidValue(validatedUser, undefined),
      evaluator: getInvalidValue(validatedEvaluator, undefined),
      chair: getInvalidValue(validatedChair, undefined),
      order: getInvalidValue(validatedOrder, undefined)
    });
  }
}

/**
 * Checks to see if there is at least one member in an array of evaluation
 * panel members, that there are no duplicate evaluation panel members, and
 * that there is one and only one chair.
 *
 * @param connection
 * @param raw - Array of evaluation panel member bodies
 * @param organization
 */
export async function validateTWUEvaluationPanelMembers(
  connection: db.Connection,
  raw: any
): Promise<
  ArrayValidation<
    CreateTWUEvaluationPanelMemberBody,
    CreateTWUEvaluationPanelMemberValidationErrors
  >
> {
  if (!Array.isArray(raw)) {
    return invalid([
      { parseFailure: ["Please provide an array of evaluation panel members."] }
    ]);
  }
  if (raw.length < MIN_TWU_EVALUATION_PANEL_MEMBERS) {
    return invalid([
      {
        members: [
          `Please select at least ${MIN_TWU_EVALUATION_PANEL_MEMBERS} evaluation panel member(s).`
        ]
      }
    ]);
  }
  const validatedEvaluationPanelMembers = await validateArrayCustomAsync(
    raw,
    async (v) => await validateTWUEvaluationPanelMember(connection, v),
    {}
  );

  const validValidatedEvaluationPanelMembers = getValidValue<
    CreateTWUEvaluationPanelMemberBody[],
    undefined
  >(validatedEvaluationPanelMembers, undefined);

  if (!validValidatedEvaluationPanelMembers) {
    return validatedEvaluationPanelMembers;
  }

  if (
    validValidatedEvaluationPanelMembers.filter((member) => member.chair)
      .length > 1
  ) {
    return invalid([
      {
        members: ["You may only specify a single chair."]
      }
    ]);
  }

  if (
    uniqBy(validValidatedEvaluationPanelMembers, "user").length !== raw.length
  ) {
    return invalid([
      {
        members: [
          "You may not specify the same evaluation panel member more than once."
        ]
      }
    ]);
  }

  return validatedEvaluationPanelMembers;
}

export async function validateTWUResourceQuestionResponseEvaluation(
  connection: db.Connection,
  proposalId: Id,
  userId: Id,
  session: AuthenticatedSession,
  consensus = false
): Promise<Validation<TWUResourceQuestionResponseEvaluation>> {
  try {
    const dbResult = await db.readOneTWUResourceQuestionResponseEvaluation(
      connection,
      proposalId,
      userId,
      session,
      consensus
    );
    if (isInvalid(dbResult)) {
      return invalid([db.ERROR_MESSAGE]);
    }
    const evaluation = dbResult.value;
    if (!evaluation) {
      return invalid([
        "The specified resource question response evaluation was not found."
      ]);
    }
    return valid(evaluation);
  } catch (exception) {
    return invalid([
      "Please select a valid resource question response evaluation."
    ]);
  }
}

export async function validateUserId(
  connection: db.Connection,
  userId: Id
): Promise<Validation<User>> {
  // Validate the provided id
  const validatedId = validateUUID(userId);
  if (isInvalid(validatedId)) {
    return validatedId;
  }
  const dbResult = await db.readOneUser(connection, userId);
  switch (dbResult.tag) {
    case "valid":
      return dbResult.value
        ? valid(dbResult.value)
        : invalid(["This user cannot be found."]);
    case "invalid":
      return invalid(["Please select a valid user"]);
  }
}

export async function validateFileRecord(
  connection: db.Connection,
  fileId: Id
): Promise<Validation<FileRecord>> {
  try {
    // Validate the provided id
    const validatedId = validateUUID(fileId);
    if (isInvalid(validatedId)) {
      return validatedId;
    }
    const dbResult = await db.readOneFileById(connection, fileId);
    if (isInvalid(dbResult)) {
      return invalid([db.ERROR_MESSAGE]);
    }
    const file = dbResult.value;
    if (file) {
      return valid(file);
    } else {
      return invalid(["The specified file was not found."]);
    }
  } catch (e) {
    return invalid(["Please specify a valid file id."]);
  }
}

export async function validateAttachments(
  connection: db.Connection,
  raw: string[]
): Promise<ArrayValidation<FileRecord>> {
  return await validateArrayAsync(raw, (v) =>
    validateFileRecord(connection, v)
  );
}

export async function validateOrganizationId(
  connection: db.Connection,
  orgId: Id,
  session: Session,
  allowInactive = false
): Promise<Validation<Organization>> {
  try {
    // Validate the provided id
    const validatedId = validateUUID(orgId);
    if (isInvalid(validatedId)) {
      return validatedId;
    }
    const dbResult = await db.readOneOrganization(
      connection,
      orgId,
      allowInactive,
      session
    );
    if (isInvalid(dbResult)) {
      return invalid([db.ERROR_MESSAGE]);
    }
    if (!dbResult.value) {
      return invalid(["The specified organization was not found."]);
    }
    return valid(dbResult.value);
  } catch (e) {
    return invalid(["Please select a valid organization."]);
  }
}

export async function validateAffiliationId(
  connection: db.Connection,
  affiliationId: Id
): Promise<Validation<Affiliation>> {
  try {
    // Validate the provided id
    const validatedId = validateUUID(affiliationId);
    if (isInvalid(validatedId)) {
      return validatedId;
    }
    const dbResult = await db.readOneAffiliationById(connection, affiliationId);
    if (isInvalid(dbResult)) {
      return invalid([db.ERROR_MESSAGE]);
    }
    const affiliation = dbResult.value;
    if (!affiliation) {
      return invalid(["The specified affiliation was not found."]);
    } else if (affiliation.membershipStatus === MembershipStatus.Inactive) {
      return invalid(["The specified affiliation is inactive."]);
    } else {
      return valid(affiliation);
    }
  } catch (e) {
    return invalid(["Please select a valid affiliation."]);
  }
}

export function validateFilePath(path: string): Validation<string> {
  return validateGenericString(path, "File path");
}

/**
 * CWU - Code With Us Validation
 */
export async function validateCWUOpportunityId(
  connection: db.Connection,
  opportunityId: Id,
  session: Session
): Promise<Validation<CWUOpportunity>> {
  try {
    const validatedId = validateUUID(opportunityId);
    if (isInvalid(validatedId)) {
      return validatedId;
    }
    const dbResult = await db.readOneCWUOpportunity(
      connection,
      opportunityId,
      session
    );
    if (isInvalid(dbResult)) {
      return invalid([db.ERROR_MESSAGE]);
    }
    const opportunity = dbResult.value;
    if (!opportunity) {
      return invalid(["The specified Code With Us opportunity was not found."]);
    }
    return valid(opportunity);
  } catch (exception) {
    return invalid(["Please select a valid Code With Us opportunity."]);
  }
}

export async function validateCWUProposalId(
  connection: db.Connection,
  proposalId: Id,
  session: Session
): Promise<Validation<CWUProposal>> {
  try {
    const validatedId = validateUUID(proposalId);
    if (isInvalid(validatedId)) {
      return validatedId;
    }
    const dbResult = await db.readOneCWUProposal(
      connection,
      proposalId,
      session
    );
    if (isInvalid(dbResult)) {
      return invalid([db.ERROR_MESSAGE]);
    }
    const proposal = dbResult.value;
    if (!proposal) {
      return invalid(["The specified proposal was not found."]);
    }
    return valid(proposal);
  } catch (exception) {
    return invalid(["Please select a valid proposal."]);
  }
}

/**
 * SWU - Sprint With Us Validation
 */
export async function validateSWUProposalId(
  connection: db.Connection,
  proposalId: Id,
  session: AuthenticatedSession
): Promise<Validation<SWUProposal>> {
  try {
    const validatedId = validateUUID(proposalId);
    if (isInvalid(validatedId)) {
      return validatedId;
    }
    const dbResult = await db.readOneSWUProposal(
      connection,
      proposalId,
      session
    );
    if (isInvalid(dbResult)) {
      return invalid([db.ERROR_MESSAGE]);
    }
    const proposal = dbResult.value;
    if (!proposal) {
      return invalid(["The specified proposal was not found."]);
    }
    return valid(proposal);
  } catch (exception) {
    return invalid(["Please select a valid proposal."]);
  }
}

export async function validateProponent(
  connection: db.Connection,
  session: Session,
  raw: any
): Promise<
  Validation<CreateProponentRequestBody, CreateProponentValidationErrors>
> {
  switch (get(raw, "tag")) {
    case "individual": {
      const validatedIndividualProponentRequestBody =
        validateIndividualProponent(get(raw, "value"));
      if (isValid(validatedIndividualProponentRequestBody)) {
        return adt(
          validatedIndividualProponentRequestBody.tag,
          adt(
            "individual" as const,
            validatedIndividualProponentRequestBody.value
          )
        );
      }
      return invalid(
        adt("individual", validatedIndividualProponentRequestBody.value)
      );
    }
    case "organization": {
      const validatedOrganization = await validateOrganizationId(
        connection,
        get(raw, "value"),
        session,
        false
      );
      if (isValid(validatedOrganization)) {
        return valid(adt("organization", validatedOrganization.value.id));
      }
      return invalid(adt("organization", validatedOrganization.value));
    }
    default:
      return invalid(
        adt("parseFailure" as const, ["Invalid proponent provided."])
      );
  }
}

export async function validateSWUOpportunityId(
  connection: db.Connection,
  opportunityId: Id,
  session: Session
): Promise<Validation<SWUOpportunity>> {
  try {
    const validatedId = validateUUID(opportunityId);
    if (isInvalid(validatedId)) {
      return validatedId;
    }
    const dbResult = await db.readOneSWUOpportunity(
      connection,
      opportunityId,
      session
    );
    if (isInvalid(dbResult)) {
      return invalid([db.ERROR_MESSAGE]);
    }
    const opportunity = dbResult.value;
    if (!opportunity) {
      return invalid([
        "The specified Sprint With Us opportunity was not found."
      ]);
    }
    return valid(opportunity);
  } catch (exception) {
    return invalid(["Please select a valid Sprint With Us opportunity."]);
  }
}

async function validateSWUEvaluationPanelMember(
  connection: db.Connection,
  raw: any
): Promise<
  Validation<
    CreateSWUEvaluationPanelMemberBody,
    CreateSWUEvaluationPanelMemberValidationErrors
  >
> {
  let validatedUser = await validateUserId(connection, getString(raw, "user"));
  const validaValidatedUser = getValidValue(validatedUser, null);
  if (validaValidatedUser && !isPublicSectorEmployee(validaValidatedUser)) {
    validatedUser = invalid(["The user must be a public sector employee."]);
  }
  const validatedEvaluator = validateEvaluationPanelMemberEvaluator(
    get(raw, "evaluator")
  );
  const validatedChair = validateEvaluationPanelMemberChair(get(raw, "chair"));
  const validatedOrder = validateOrder(getNumber(raw, "order"));

  if (
    allValid([
      validatedUser,
      validatedEvaluator,
      validatedChair,
      validatedOrder
    ])
  ) {
    return valid({
      evaluator: validatedEvaluator.value,
      chair: validatedChair.value,
      user: (validatedUser.value as User).id,
      order: validatedOrder.value
    } as CreateSWUEvaluationPanelMemberBody);
  } else {
    return invalid({
      user: getInvalidValue(validatedUser, undefined),
      evaluator: getInvalidValue(validatedEvaluator, undefined),
      chair: getInvalidValue(validatedChair, undefined),
      order: getInvalidValue(validatedOrder, undefined)
    });
  }
}

/**
 * Checks to see if there is at least one member in an array of evaluation
 * panel members, that there are no duplicate evaluation panel members, and
 * that there is one and only one chair.
 *
 * @param connection
 * @param raw - Array of evaluation panel member bodies
 * @param organization
 */
export async function validateSWUEvaluationPanelMembers(
  connection: db.Connection,
  raw: any
): Promise<
  ArrayValidation<
    CreateSWUEvaluationPanelMemberBody,
    CreateSWUEvaluationPanelMemberValidationErrors
  >
> {
  if (!Array.isArray(raw)) {
    return invalid([
      { parseFailure: ["Please provide an array of evaluation panel members."] }
    ]);
  }
  if (raw.length < MIN_SWU_EVALUATION_PANEL_MEMBERS) {
    return invalid([
      {
        members: [
          `Please select at least ${MIN_SWU_EVALUATION_PANEL_MEMBERS} evaluation panel member(s).`
        ]
      }
    ]);
  }
  const validatedEvaluationPanelMembers = await validateArrayCustomAsync(
    raw,
    async (v) => await validateSWUEvaluationPanelMember(connection, v),
    {}
  );

  const validValidatedEvaluationPanelMembers = getValidValue<
    CreateSWUEvaluationPanelMemberBody[],
    undefined
  >(validatedEvaluationPanelMembers, undefined);

  if (!validValidatedEvaluationPanelMembers) {
    return validatedEvaluationPanelMembers;
  }

  if (
    validValidatedEvaluationPanelMembers.filter((member) => member.chair)
      .length > 1
  ) {
    return invalid([
      {
        members: ["You may only specify a single chair."]
      }
    ]);
  }

  if (
    uniqBy(validValidatedEvaluationPanelMembers, "user").length !== raw.length
  ) {
    return invalid([
      {
        members: [
          "You may not specify the same evaluation panel member more than once."
        ]
      }
    ]);
  }

  return validatedEvaluationPanelMembers;
}

export async function validateMember(
  connection: db.Connection,
  memberId: Id,
  organization: Id
): Promise<Validation<User>> {
  const validatedUser = await validateUserId(connection, memberId);
  if (isInvalid(validatedUser)) {
    return validatedUser;
  }
  const affiliation = getValidValue(
    await db.readOneAffiliation(
      connection,
      validatedUser.value.id,
      organization
    ),
    null
  );
  if (affiliation?.membershipStatus === MembershipStatus.Active) {
    return validatedUser;
  } else {
    return invalid(["User is not an active member of the organization."]);
  }
}

export async function validateTeamMember(
  connection: db.Connection,
  raw: any,
  organization: Id
): Promise<
  Validation<
    CreateSWUProposalTeamMemberBody,
    CreateSWUProposalTeamMemberValidationErrors
  >
> {
  const validatedMember = await validateMember(
    connection,
    getString(raw, "member"),
    organization
  );
  const validatedScrumMaster = validateSWUProposalTeamMemberScrumMaster(
    get(raw, "scrumMaster")
  );

  if (allValid([validatedMember, validatedScrumMaster])) {
    return valid({
      member: (validatedMember.value as User).id,
      scrumMaster: validatedScrumMaster.value
    } as CreateSWUProposalTeamMemberBody);
  } else {
    return invalid({
      member: getInvalidValue(validatedMember, undefined),
      scrumMaster: getInvalidValue(validatedScrumMaster, undefined)
    });
  }
}

/**
 * Checks to see if there is at least one member in an array of members, and
 * that they are a ScrumMaster and that only one member is a Scrum Master.
 *
 * @param connection
 * @param raw - Member as member id and boolean value as scrumMaster true/false
 * @param organization
 */
export async function validateSWUProposalTeamMembers(
  connection: db.Connection,
  raw: any,
  organization: Id
): Promise<
  ArrayValidation<
    CreateSWUProposalTeamMemberBody,
    CreateSWUProposalTeamMemberValidationErrors
  >
> {
  if (!Array.isArray(raw)) {
    return invalid([
      { parseFailure: ["Please provide an array of selected team members."] }
    ]);
  }
  if (!raw.length) {
    return invalid([{ members: ["Please select at least one team member."] }]);
  }
  const validatedMembers = await validateArrayCustomAsync(
    raw,
    async (v) => await validateTeamMember(connection, v, organization),
    {}
  );
  if (
    getValidValue(validatedMembers, []).filter((member) => member.scrumMaster)
      .length > 1
  ) {
    return invalid([
      {
        members: ["You may only specify a single scrum master."]
      }
    ]);
  }
  return validatedMembers;
}

export async function validateSWUProposalPhase(
  connection: db.Connection,
  raw: any,
  opportunityPhase: SWUOpportunityPhase | null,
  organization: Id
): Promise<
  Validation<
    CreateSWUProposalPhaseBody | undefined,
    CreateSWUProposalPhaseValidationErrors
  >
> {
  if (!raw && opportunityPhase) {
    return invalid({
      phase: ["This opportunity requires this phase."]
    });
  }

  if (!raw) {
    return valid(undefined);
  }

  if (!opportunityPhase) {
    return invalid({
      phase: ["This opportunity does not require this phase."]
    });
  }

  const validatedMembers = await validateSWUProposalTeamMembers(
    connection,
    get(raw, "members"),
    organization
  );
  const validatedProposedCost = validateSWUPhaseProposedCost(
    getNumber<number>(raw, "proposedCost"),
    opportunityPhase.maxBudget
  );

  if (allValid([validatedMembers, validatedProposedCost])) {
    return valid({
      members: validatedMembers.value,
      proposedCost: validatedProposedCost.value
    } as CreateSWUProposalPhaseBody);
  } else {
    return invalid<CreateSWUProposalPhaseValidationErrors>({
      members: getInvalidValue<
        CreateSWUProposalTeamMemberValidationErrors[],
        undefined
      >(validatedMembers, undefined),
      proposedCost: getInvalidValue(validatedProposedCost, undefined)
    });
  }
}

export async function validateSWUProposalTeam(
  connection: db.Connection,
  opportunity: SWUOpportunity,
  inceptionMemberIds: Id[],
  prototypeMemberIds: Id[],
  implementationMemberIds: Id[]
): Promise<Validation<string[]>> {
  // Extract a flattened set of team members across phases
  const teamMemberIds = union(
    inceptionMemberIds,
    prototypeMemberIds,
    implementationMemberIds
  );
  const dbResults = await Promise.all(
    teamMemberIds.map(
      async (id) => await db.readOneUser(connection, id),
      undefined
    )
  );
  const teamMembers = dbResults
    .map((v) => getValidValue(v, null))
    .filter((v) => !!v) as User[];
  return validateSWUProposalTeamCapabilities(opportunity, teamMembers);
}

export async function validateDraftProposalOrganization(
  connection: db.Connection,
  organization: Id | undefined,
  session: Session
): Promise<Validation<Organization | undefined>> {
  return await optionalAsync(organization, (v) =>
    validateOrganizationId(connection, v, session, false)
  );
}

export async function validateSWUTeamQuestionResponseEvaluation(
  connection: db.Connection,
  proposalId: Id,
  userId: Id,
  session: AuthenticatedSession,
  consensus = false
): Promise<Validation<SWUTeamQuestionResponseEvaluation>> {
  try {
    const dbResult = await db.readOneSWUTeamQuestionResponseEvaluation(
      connection,
      proposalId,
      userId,
      session,
      consensus
    );
    if (isInvalid(dbResult)) {
      return invalid([db.ERROR_MESSAGE]);
    }
    const evaluation = dbResult.value;
    if (!evaluation) {
      return invalid([
        "The specified team question response evaluation was not found."
      ]);
    }
    return valid(evaluation);
  } catch (exception) {
    return invalid([
      "Please select a valid team question response evaluation."
    ]);
  }
}

export async function validateContentId(
  connection: db.Connection,
  contentId: Id,
  session: AuthenticatedSession
): Promise<Validation<Content>> {
  try {
    const validatedId = validateUUID(contentId);
    if (isInvalid(validatedId)) {
      return validatedId;
    }
    const dbResult = await db.readOneContentById(
      connection,
      contentId,
      session
    );
    if (isInvalid(dbResult)) {
      return invalid([db.ERROR_MESSAGE]);
    }
    const content = dbResult.value;
    if (!content) {
      return invalid(["The specified content was not found."]);
    }
    return valid(content);
  } catch (exception) {
    return invalid(["Please select a valid content id."]);
  }
}

/**
 * Contact List Export Validation
 */

export interface ExportContactListValidationErrors {
  userTypes?: string[];
  fields?: string[];
  permissions?: string[];
}

export function validateContactListUserTypes(
  userTypes: string[]
): Validation<UserType[]> {
  if (!userTypes.length) {
    return invalid(["At least one user type must be specified"]);
  }

  const validUserTypes = [UserType.Government, UserType.Vendor];
  const invalidUserTypes = userTypes.filter(
    (type: string) => !validUserTypes.includes(type as UserType)
  );

  if (invalidUserTypes.length > 0) {
    return invalid([`Invalid user type(s): ${invalidUserTypes.join(", ")}`]);
  }

  return valid(userTypes.map((type) => type as UserType));
}

export function validateContactListFields(
  fields: string[]
): Validation<string[]> {
  if (!fields.length) {
    return invalid(["At least one field must be specified"]);
  }

  const validFields = ["firstName", "lastName", "email", "organizationName"];
  const invalidFields = fields.filter(
    (field: string) => !validFields.includes(field)
  );

  if (invalidFields.length > 0) {
    return invalid([`Invalid field(s): ${invalidFields.join(", ")}`]);
  }

  return valid(fields);
}

export function validateContactListExportParams(
  userTypes: string[],
  fields: string[]
): Validation<
  { userTypes: UserType[]; fields: string[] },
  ExportContactListValidationErrors
> {
  const validatedUserTypes = validateContactListUserTypes(userTypes);
  const validatedFields = validateContactListFields(fields);

  if (isValid(validatedUserTypes) && isValid(validatedFields)) {
    return valid({
      userTypes: validatedUserTypes.value,
      fields: validatedFields.value
    });
  } else {
    return invalid({
      userTypes: getInvalidValue(validatedUserTypes, undefined),
      fields: getInvalidValue(validatedFields, undefined)
    });
  }
}
