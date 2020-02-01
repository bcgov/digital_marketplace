import * as db from 'back-end/lib/db';
import { Affiliation, MembershipStatus } from 'shared/lib/resources/affiliation';
import { CWUOpportunity } from 'shared/lib/resources/code-with-us';
import { FileRecord } from 'shared/lib/resources/file';
import { Organization } from 'shared/lib/resources/organization';
import { User } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';
import { invalid, isInvalid, isValid, valid, validateArrayAsync, validateGenericString, validateUUID, Validation } from 'shared/lib/validation';

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

export async function validateAttachments(connection: db.Connection, raw: string[]): Promise<Validation<FileRecord[]>> {
  const validatedArray = await validateArrayAsync(raw, v => validateFileRecord(connection, v));
  return isValid(validatedArray) ? validatedArray : invalid(['Invalid attachment specified.']);
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

export async function validateCWUOpportunityId(connection: db.Connection, opportunityId: Id): Promise<Validation<CWUOpportunity>> {
  try {
    const validatedId = validateUUID(opportunityId);
    if (isInvalid(validatedId)) {
      return validatedId;
    }
    const dbResult = await db.readOneCWUOpportunity(connection, opportunityId);
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
