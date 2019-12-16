import { Connection, readOneAffiliationById, readOneFile, readOneOrganization, readOneUser } from 'back-end/lib/db';
import { Affiliation, MembershipStatus } from 'shared/lib/resources/affiliation';
import { PublicFile } from 'shared/lib/resources/file';
import { Organization } from 'shared/lib/resources/organization';
import { User } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

export async function validateUserId(connection: Connection, userId: Id): Promise<Validation<User>> {
  try {
    const user = await readOneUser(connection, userId);
    if (user) {
      return valid(user);
    } else {
      return invalid(['This user cannot be found.']);
    }
  } catch (e) {
    return invalid(['Please select a valid user.']);
  }
}

export async function validateImageFile(connection: Connection, fileId: Id): Promise<Validation<PublicFile>> {
  try {
    const file = await readOneFile(connection, fileId);
    if (file) {
      return valid(file);
    } else {
      return invalid(['The specified image file was not found.']);
    }
  } catch (e) {
    return invalid(['Please specify a valid image file id.']);
  }
}

export async function validateOrganizationId(connection: Connection, orgId: Id): Promise<Validation<Organization>> {
  try {
    const organization = await readOneOrganization(connection, orgId);
    if (!organization) {
      return invalid(['The specified organization was not found.']);
    } else if (!organization.active) {
      return invalid(['The specified organization is inactive.']);
    } else {
      return valid(organization);
    }
  } catch (e) {
    return invalid(['Please select a valid organization.']);
  }
}

export async function validateAffiliationId(connection: Connection, affiliationId: Id): Promise<Validation<Affiliation>> {
  try {
    const affiliation = await readOneAffiliationById(connection, affiliationId);
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
