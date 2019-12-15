import { Connection, readOneFile, readOneOrganization, readOneUser } from 'back-end/lib/db';
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
      return invalid(['The spcified organization is inactive.']);
    } else {
      return valid(organization);
    }
  } catch (e) {
    return invalid(['Please select a valid organization.']);
  }
}
