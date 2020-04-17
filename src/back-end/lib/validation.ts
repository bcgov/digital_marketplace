import * as db from 'back-end/lib/db';
import { get, union } from 'lodash';
import { getNumber, getString } from 'shared/lib';
import { Affiliation, MembershipStatus } from 'shared/lib/resources/affiliation';
import { FileRecord } from 'shared/lib/resources/file';
import { CWUOpportunity } from 'shared/lib/resources/opportunity/code-with-us';
import { SWUOpportunity, SWUOpportunityPhase } from 'shared/lib/resources/opportunity/sprint-with-us';
import { Organization } from 'shared/lib/resources/organization';
import { CreateProponentRequestBody, CreateProponentValidationErrors, CWUProposal } from 'shared/lib/resources/proposal/code-with-us';
import { CreateSWUProposalPhaseBody, CreateSWUProposalPhaseValidationErrors, CreateSWUProposalTeamMemberBody, CreateSWUProposalTeamMemberValidationErrors, SWUProposal } from 'shared/lib/resources/proposal/sprint-with-us';
import { AuthenticatedSession, Session } from 'shared/lib/resources/session';
import { User } from 'shared/lib/resources/user';
import { adt, Id } from 'shared/lib/types';
import { allValid, ArrayValidation, getInvalidValue, getValidValue, invalid, isInvalid, isValid, valid, validateArrayAsync, validateArrayCustomAsync, validateGenericString, validateUUID, Validation } from 'shared/lib/validation';
import { validateIndividualProponent } from 'shared/lib/validation/proposal/code-with-us';
import { validateSWUPhaseProposedCost, validateSWUProposalTeamCapabilities, validateSWUProposalTeamMemberScrumMaster } from 'shared/lib/validation/proposal/sprint-with-us';
import { isArray } from 'util';

export async function validateUserId(connection: db.Connection, userId: Id): Promise<Validation<User>> {
  // Validate the provided id
  const validatedId = validateUUID(userId);
  if (isInvalid(validatedId)) {
    return validatedId;
  }
  const dbResult = await db.readOneUser(connection, userId);
  switch (dbResult.tag) {
    case 'valid':
      return dbResult.value ? valid(dbResult.value) : invalid(['This user cannot be found.']);
    case 'invalid':
      return invalid(['Please select a valid user']);
  }
}

export async function validateFileRecord(connection: db.Connection, fileId: Id): Promise<Validation<FileRecord>> {
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
      return invalid(['The specified image file was not found.']);
    }
  } catch (e) {
    return invalid(['Please specify a valid image file id.']);
  }
}

export async function validateAttachments(connection: db.Connection, raw: string[]): Promise<ArrayValidation<FileRecord>> {
  return await validateArrayAsync(raw, v => validateFileRecord(connection, v));
}

export async function validateOrganizationId(connection: db.Connection, orgId: Id, session: Session, allowInactive = false): Promise<Validation<Organization>> {
  try {
    // Validate the provided id
    const validatedId = validateUUID(orgId);
    if (isInvalid(validatedId)) {
      return validatedId;
    }
    const dbResult = await db.readOneOrganization(connection, orgId, allowInactive, session);
    if (isInvalid(dbResult)) {
      return invalid([db.ERROR_MESSAGE]);
    }
    if (!dbResult.value) {
      return invalid(['The specified organization was not found.']);
    }
    return valid(dbResult.value);
  } catch (e) {
    return invalid(['Please select a valid organization.']);
  }
}

export async function validateAffiliationId(connection: db.Connection, affiliationId: Id): Promise<Validation<Affiliation>> {
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
      return invalid(['The specified affiliation was not found.']);
    } else if (affiliation.membershipStatus === MembershipStatus.Inactive) {
      return invalid(['The specified affiliation is inactive.']);
    } else {
      return valid(affiliation);
    }
  } catch (e) {
    return invalid(['Please select a valid affiliation.']);
  }
}

export function validateFilePath(path: string): Validation<string> {
  return validateGenericString(path, 'File path');
}

export async function validateCWUOpportunityId(connection: db.Connection, opportunityId: Id, session: Session): Promise<Validation<CWUOpportunity>> {
  try {
    const validatedId = validateUUID(opportunityId);
    if (isInvalid(validatedId)) {
      return validatedId;
    }
    const dbResult = await db.readOneCWUOpportunity(connection, opportunityId, session);
    if (isInvalid(dbResult)) {
      return invalid([db.ERROR_MESSAGE]);
    }
    const opportunity = dbResult.value;
    if (!opportunity) {
      return invalid(['The specified Code With Us opportunity was not found.']);
    }
    return valid(opportunity);

  } catch (exception) {
    return invalid(['Please select a valid Code With Us opportunity.']);
  }
}

export async function validateCWUProposalId(connection: db.Connection, proposalId: Id, session: Session): Promise<Validation<CWUProposal>> {
  try {
    const validatedId = validateUUID(proposalId);
    if (isInvalid(validatedId)) {
      return validatedId;
    }
    const dbResult = await db.readOneCWUProposal(connection, proposalId, session);
    if (isInvalid(dbResult)) {
      return invalid([db.ERROR_MESSAGE]);
    }
    const proposal = dbResult.value;
    if (!proposal) {
      return invalid(['The specified proposal was not found.']);
    }
    return valid(proposal);
  } catch (exception) {
    return invalid(['Please select a valid proposal.']);
  }
}

export async function validateSWUProposalId(connection: db.Connection, proposalId: Id, session: AuthenticatedSession): Promise<Validation<SWUProposal>> {
  try {
    const validatedId = validateUUID(proposalId);
    if (isInvalid(validatedId)) {
      return validatedId;
    }
    const dbResult = await db.readOneSWUProposal(connection, proposalId, session);
    if (isInvalid(dbResult)) {
      return invalid([db.ERROR_MESSAGE]);
    }
    const proposal = dbResult.value;
    if (!proposal) {
      return invalid(['The specified proposal was not found.']);
    }
    return valid(proposal);
  } catch (exception) {
    return invalid(['Please select a valid proposal.']);
  }
}

export async function validateProponent(connection: db.Connection, session: Session, raw: any): Promise<Validation<CreateProponentRequestBody, CreateProponentValidationErrors>> {
  switch (get(raw, 'tag')) {
    case 'individual':
      const validatedIndividualProponentRequestBody = validateIndividualProponent(get(raw, 'value'));
      if (isValid(validatedIndividualProponentRequestBody)) {
        return adt(validatedIndividualProponentRequestBody.tag, adt('individual' as const, validatedIndividualProponentRequestBody.value));
      }
      return invalid(adt('individual', validatedIndividualProponentRequestBody.value));
    case 'organization':
      const validatedOrganization = await validateOrganizationId(connection, get(raw, 'value'), session, false);
      if (isValid(validatedOrganization)) {
        return valid(adt('organization', validatedOrganization.value.id));
      }
      return invalid(adt('organization', validatedOrganization.value));
    default:
      return invalid(adt('parseFailure' as const, ['Invalid proponent provided.']));
  }
}

export async function validateSWUOpportunityId(connection: db.Connection, opportunityId: Id, session: Session): Promise<Validation<SWUOpportunity>> {
  try {
    const validatedId = validateUUID(opportunityId);
    if (isInvalid(validatedId)) {
      return validatedId;
    }
    const dbResult = await db.readOneSWUOpportunity(connection, opportunityId, session);
    if (isInvalid(dbResult)) {
      return invalid([db.ERROR_MESSAGE]);
    }
    const opportunity = dbResult.value;
    if (!opportunity) {
      return invalid(['The specified Sprint With Us opportunity was not found.']);
    }
    return valid(opportunity);

  } catch (exception) {
    return invalid(['Please select a valid Sprint With Us opportunity.']);
  }
}

export async function validateTeamMember(connection: db.Connection, raw: any): Promise<Validation<CreateSWUProposalTeamMemberBody, CreateSWUProposalTeamMemberValidationErrors>> {
  const validatedMember = await validateUserId(connection, getString(raw, 'member'));
  const validatedScrumMaster = validateSWUProposalTeamMemberScrumMaster(get(raw, 'scrumMaster'));

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

export async function validateSWUProposalTeamMembers(connection: db.Connection, raw: any): Promise<ArrayValidation<CreateSWUProposalTeamMemberBody, CreateSWUProposalTeamMemberValidationErrors>> {
  if (!isArray(raw)) { return invalid([{ parseFailure: ['Please provide an array of selected team members.'] }]); }
  if (!raw.length) { return invalid([{ members: ['Please select at least one team member.'] }]); }
  const validatedMembers = await validateArrayCustomAsync(raw, async v => await validateTeamMember(connection, v), {});
  if (getValidValue(validatedMembers, []).filter(member => member.scrumMaster).length > 1) {
    return invalid([{
      members: ['You may only specify a single scrum master.']
    }]);
  }
  return validatedMembers;
}

export async function validateSWUProposalPhase(connection: db.Connection, raw: any, opportunityPhase: SWUOpportunityPhase | null): Promise<Validation<CreateSWUProposalPhaseBody | undefined, CreateSWUProposalPhaseValidationErrors>> {

  if (!raw && opportunityPhase) {
    return invalid({
      phase: ['This opportunity requires this phase.']
    });
  }

  if (!raw) {
    return valid(undefined);
  }

  if (!opportunityPhase) {
    return invalid({
      phase: ['This opportunity does not require this phase.']
    });
  }

  const validatedMembers = await validateSWUProposalTeamMembers(connection, get(raw, 'members'));
  const validatedProposedCost = validateSWUPhaseProposedCost(getNumber<number>(raw, 'proposedCost'), opportunityPhase.maxBudget);

  if (allValid([validatedMembers, validatedProposedCost])) {
    return valid({
      members: validatedMembers.value,
      proposedCost: validatedProposedCost.value
    } as CreateSWUProposalPhaseBody);
  } else {
    return invalid({
      members: getInvalidValue(validatedMembers, undefined),
      proposedCost: getInvalidValue(validatedProposedCost, undefined)
    });
  }
}

export async function validateSWUProposalTeam(connection: db.Connection, opportunity: SWUOpportunity, inceptionMemberIds: Id[], prototypeMemberIds: Id[], implementationMemberIds: Id[]): Promise<Validation<string[]>> {
  // Extract a flattened set of team members across phases
  const teamMemberIds = union(inceptionMemberIds, prototypeMemberIds, implementationMemberIds);

  // If a min team member count was specified, ensure that requirement is met
  if (opportunity.minTeamMembers && teamMemberIds.length < opportunity.minTeamMembers) {
    return invalid([`You must have a minimum of ${opportunity.minTeamMembers} team members to apply for this opportunity.`]);
  }

  const dbResults = (await Promise.all(teamMemberIds.map(async id => await db.readOneUser(connection, id), undefined)));
  const teamMembers = dbResults.map(v => getValidValue(v, null)).filter(v => !!v) as User[];
  return validateSWUProposalTeamCapabilities(opportunity, teamMembers);
}
