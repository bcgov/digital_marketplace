import * as db from 'back-end/lib/db';
import { get } from 'lodash';
import { Affiliation, MembershipStatus } from 'shared/lib/resources/affiliation';
import { FileRecord } from 'shared/lib/resources/file';
import { CWUOpportunity } from 'shared/lib/resources/opportunity/code-with-us';
import { Organization } from 'shared/lib/resources/organization';
import { CreateProponentRequestBody, CreateProponentValidationErrors, CWUProposal } from 'shared/lib/resources/proposal/code-with-us';
import { Session } from 'shared/lib/resources/session';
import { User } from 'shared/lib/resources/user';
import { adt, Id } from 'shared/lib/types';
import { ArrayValidation, invalid, isInvalid, isValid, valid, validateArrayAsync, validateGenericString, validateUUID, Validation } from 'shared/lib/validation';
import { validateIndividualProponent } from 'shared/lib/validation/proposal/code-with-us';

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

export async function validateOrganizationId(connection: db.Connection, orgId: Id, allowInactive = false): Promise<Validation<Organization>> {
  try {
    // Validate the provided id
    const validatedId = validateUUID(orgId);
    if (isInvalid(validatedId)) {
      return validatedId;
    }
    const dbResult = await db.readOneOrganization(connection, orgId, allowInactive);
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

type ValidatedCreateProponentRequestBody = CreateProponentRequestBody;

export async function validateProponent(connection: db.Connection, raw: any): Promise<Validation<ValidatedCreateProponentRequestBody, CreateProponentValidationErrors>> {
  switch (get(raw, 'tag')) {
    case 'individual':
      const validatedIndividualProponentRequestBody = validateIndividualProponent(get(raw, 'value'));
      if (isValid(validatedIndividualProponentRequestBody)) {
        return valid(adt('individual', validatedIndividualProponentRequestBody.value));
      }
      return invalid(adt('individual', validatedIndividualProponentRequestBody.value));
    case 'organization':
      const validatedOrganization = await validateOrganizationId(connection, get(raw, 'value'), false);
      if (isValid(validatedOrganization)) {
        return valid(adt('organization', validatedOrganization.value.id));
      }
      return invalid(adt('organization', validatedOrganization.value));
    default:
      return invalid(adt('parseFailure' as const, ['Invalid proponent provided.']));
  }
}
