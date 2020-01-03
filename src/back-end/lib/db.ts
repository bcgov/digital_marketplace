import { generateUuid } from 'back-end/lib';
import { ValidatedCreateRequestBody as ValidatedAffiliationCreateRequestBody } from 'back-end/lib/resources/affiliation';
import { hashFile, ValidatedCreateRequestBody as ValidatedFileCreateRequestBody } from 'back-end/lib/resources/file';
import { ValidatedCreateRequestBody as ValidatedOrgCreateRequestBody, ValidatedUpdateRequestBody as ValidatedOrgUpdateRequestBody } from 'back-end/lib/resources/organization';
import { ValidatedUpdateRequestBody as ValidatedUserUpdateRequestBody } from 'back-end/lib/resources/user';
import { readFile } from 'fs';
import Knex from 'knex';
import { Affiliation, AffiliationSlim, MembershipStatus, MembershipType } from 'shared/lib/resources/affiliation';
import { FileBlob, FileRecord } from 'shared/lib/resources/file';
import { Organization, OrganizationSlim } from 'shared/lib/resources/organization';
import { Session } from 'shared/lib/resources/session';
import { User, UserType } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';

export type Connection = Knex<any, any>;

export async function createUser(connection: Connection, user: Omit<User, 'id' | 'notificationsOn' | 'acceptedTerms'>): Promise<User> {
  const now = new Date();
  const [result] = await connection('users')
    .insert({
      ...user,
      id: generateUuid(),
      createdAt: now,
      updatedAt: now
    }, ['*']);
  if (!result) {
    throw new Error('unable to create user');
  }
  return await rawUserToUser(connection, result);
}

export async function updateUser(connection: Connection, userInfo: ValidatedUserUpdateRequestBody): Promise<User> {
  const now = new Date();
  const [result] = await connection('users')
    .where({ id: userInfo.id })
    .update({
      ...userInfo,
      updatedAt: now
    }, ['*']);
  if (!result) {
    throw new Error('unable to update user');
  }
  return await rawUserToUser(connection, result);
}

export async function readOneUser(connection: Connection, id: Id): Promise<User | null> {
  const result = await connection('users')
    .where({ id })
    .first();
  return result ? await rawUserToUser(connection, result) : null;
}

export async function readManyUsers(connection: Connection): Promise<User[]> {
  const results = await connection('users').select();
  return Promise.all(results.map(async raw => await rawUserToUser(connection, raw)));
}

interface RawUserToUserParams extends Omit<User, 'avatarImageFile'> {
  avatarImageFile: Id;
}

export async function rawUserToUser(connection: Connection, params: RawUserToUserParams): Promise<User> {
  const { avatarImageFile: fileId, ...restOfRawUser } = params;
  if (fileId) {
    const avatarImageFile = await readOneFileById(connection, fileId);
    return {
      ...restOfRawUser,
      avatarImageFile
    };
  } else {
    return restOfRawUser;
  }
}

export async function findOneUserByTypeAndUsername(connection: Connection, type: UserType, idpUsername: string): Promise<User | null> {
  let result: User;

  // If Government, we want to search on Admin types as well.
  if (type === UserType.Government) {
    result = await connection('users')
      .where({ type, idpUsername })
      .orWhere({ type: UserType.Admin, idpUsername })
      .first();
  } else {
    result = await connection('users')
      .where ({type, idpUsername })
      .first();
  }
  return result ? result : null;
}

interface RawSessionToSessionParams {
  id: Id;
  accessToken?: string;
  user?: Id;
}

async function rawSessionToSession(connection: Connection, params: RawSessionToSessionParams): Promise<Session> {
  const session = {
    id: params.id,
    accessToken: params.accessToken
  };
  if (params.user) {
    const user = await readOneUser(connection, params.user);
    if (user) {
      return {
        ...session,
        user
      };
    }
  }
  return session;
}

export async function createAnonymousSession(connection: Connection): Promise<Session> {
  const now = new Date();
  const [result] = await connection('sessions')
    .insert({
      id: generateUuid(),
      createdAt: now,
      updatedAt: now
    }, ['*']);
  if (!result) {
    throw new Error('unable to create anonymous session');
  }
  return await rawSessionToSession(connection, {
    id: result.id
  });
}

export async function readOneSession(connection: Connection, id: Id): Promise<Session> {
  const result = await connection('sessions')
    .where({ id })
    .first();
  if (!result) { return await createAnonymousSession(connection); }
  return await rawSessionToSession(connection, {
    id: result.id,
    accessToken: result.accessToken,
    user: result.user
  });
}

export async function updateSessionWithToken(connection: Connection, id: Id, accessToken: string): Promise<Session> {
  const [result] = await connection('sessions')
    .where({ id })
    .update({
      accessToken,
      updatedAt: new Date()
    }, ['*']);
  if (!result) {
    throw new Error('unable to update session');
  }
  return await rawSessionToSession(connection, {
    id: result.id,
    accessToken: result.accessToken,
    user: result.user
  });
}

export async function updateSessionWithUser(connection: Connection, id: Id, userId: Id): Promise<Session> {
  const [result] = await connection('sessions')
    .where({ id })
    .update({
      user: userId,
      updatedAt: new Date()
    }, ['*']);
  if (!result) {
    throw new Error('unable to update session');
  }
  return await rawSessionToSession(connection, {
    id: result.id,
    accessToken: result.accessToken,
    user: result.user
  });
}

export async function deleteSession(connection: Connection, id: Id): Promise<null> {
  await connection('sessions')
    .where({ id })
    .delete();
  return null;
}

/**
 * Return all organizations from the database.
 *
 * If the user is:
 *
 * - An admin: Include owner information for all organizations.
 * - A vendor: Include owner information only for owned organizations.
 */

export async function readManyOrganizations(connection: Connection, session: Session): Promise<OrganizationSlim[]> {
  const query = connection('organizations')
    .select('organizations.id as org_id', 'legalName', 'files.id as logoImageFileId')
    .leftOuterJoin('files', 'organizations.logoImageFile', '=', 'files.id');
  // If a user is attached to this session, we need to add owner info to some or all of the orgs
  if (session.user && (session.user.type === UserType.Admin || session.user.type === UserType.Vendor)) {
    query
      .select('users.id as ownerId', 'users.name as ownerName')
      .leftOuterJoin('affiliations', 'organizations.id', '=', 'affiliations.organization')
      .leftOuterJoin('users', 'affiliations.user', '=', 'users.id')
      .andWhere({ 'affiliations.membershipType': MembershipType.Owner });
  }
  const results = await query;
  // Only include ownership information for vendors' owned organizations.
  return Promise.all(results.map(async raw => {
    if (session.user && session.user.type === UserType.Vendor && raw.ownerId !== session.user.id) {
      raw = {
        ...raw,
        ownerId: undefined,
        ownerName: undefined
      };
    }
    return await rawOrganizationToOrganizationSlim(connection, raw);
  }));
}

export async function rawOrganizationToOrganizationSlim(connection: Connection, params: RawOrganizationSlimToOrganizationSlimParams): Promise<OrganizationSlim> {
  const organization: OrganizationSlim = {
    id: params.org_id,
    legalName: params.legalName
  };
  if (params.logoImageFileId) {
    organization.logoImageFile = await readOneFileById(connection, params.logoImageFileId);
  }
  if (params.ownerId && params.ownerName) {
    organization.owner = {
      id: params.ownerId,
      name: params.ownerName
    };
  }
  return organization;
}

export async function rawOrganizationToOrganization(connection: Connection, params: RawOrganizationToOrganizationParams): Promise<Organization> {
  const { logoImageFile: fileId, ...restOfRawOrg } = params;
  if (fileId) {
    const logoImageFile = await readOneFileById(connection, fileId);
    return {
      ...restOfRawOrg,
      logoImageFile
    };
  } else {
    return restOfRawOrg;
  }
}

interface RawOrganizationSlimToOrganizationSlimParams {
  org_id: Id;
  legalName: string;
  logoImageFileId?: Id;
  ownerId: Id;
  ownerName: string;
}

interface RawOrganizationToOrganizationParams extends Omit<Organization, 'logoImageFile'> {
  logoImageFile?: Id;
}

export async function createOrganization(connection: Connection, user: Id, organization: ValidatedOrgCreateRequestBody): Promise<Organization> {
  const now = new Date();
  return await connection.transaction(async trx => {
    // Create organization
    const [result] = await connection('organizations')
      .transacting(trx)
      .insert({
        ...organization,
        logoImageFile: organization.logoImageFile && organization.logoImageFile.id,
        id: generateUuid(),
        active: true,
        createdAt: now,
        updatedAt: now
      }, ['*']);
    if (!result) {
      throw new Error('unable to create organization');
    }
    // Create affiliation
    await createAffiliation(trx, {
      user,
      organization: result.id,
      membershipType: MembershipType.Owner,
      membershipStatus: MembershipStatus.Active
    });
    return result;
  });
}

export async function updateOrganization(connection: Connection, organization: ValidatedOrgUpdateRequestBody): Promise<Organization> {
  const now = new Date();
  const [result] = await connection('organizations')
    .where({ id: organization.id })
    .update({
      ...organization,
      updatedAt: now
    }, ['*']);
  if (!result) {
    throw new Error('unable to update organization');
  }
  return result;
}

export async function readOneOrganization(connection: Connection, id: Id): Promise<Organization> {
  const result = await connection('organizations')
    .where({ id })
    .first();

  return await rawOrganizationToOrganization(connection, result);
}

export async function createAffiliation(connection: Connection, affiliation: ValidatedAffiliationCreateRequestBody): Promise<Affiliation> {
  const now = new Date();
  return await connection.transaction(async trx => {
    const [result] = await connection('affiliations')
      .transacting(trx)
      .insert({
        ...affiliation,
        id: generateUuid(),
        createdAt: now
      }, ['*']);

    if (!result) {
      throw new Error('unable to create affiliation');
    }

    // Mark any other affiliation for this user/org as INACTIVE
    await connection('affiliations')
      .transacting(trx)
      .where({
        user: affiliation.user,
        organization: affiliation.organization
      })
      .andWhereNot({
        id: result.id
      })
      .update({
        membershipStatus: MembershipStatus.Inactive
      });

    return result;
  });
}

export async function readManyAffiliations(connection: Connection, userId: Id): Promise<AffiliationSlim[]> {
  const results = await connection('affiliations')
    .join('organizations', 'affiliations.organization', '=', 'organizations.id')
    .select('affiliations.*')
    .where({
      'affiliations.user': userId,
      'organizations.active': true
    });

  return Promise.all(results.map(async raw => rawAffiliationToAffiliation(connection, raw)));
}

export async function readOneAffiliation(connection: Connection, user: Id, organization: Id): Promise<Affiliation> {
  const result = await connection('affiliations')
    .where({
      user,
      organization
    })
    .andWhereNot({ membershipStatus: MembershipStatus.Inactive })
    .orderBy('createdAt')
    .first();

  return result;
}

export async function readOneAffiliationById(connection: Connection, id: Id): Promise<Affiliation> {
  const result = await connection('affiliations')
    .where({
      id
    })
    .first();

  return result;
}

interface RawAffiliationToAffiliationParams {
  user: Id;
  organization: Id;
  membershipType: MembershipType;
  createdAt: Date;
  updatedAt: Date;
}

export async function rawAffiliationToAffiliation(connection: Connection, params: RawAffiliationToAffiliationParams): Promise<AffiliationSlim> {
  const { organization: orgId, membershipType } = params;
  const organization = await readOneOrganization(connection, orgId);
  return {
    organizationName: organization.legalName,
    membershipType
  };
}

export async function approveAffiliation(connection: Connection, id: Id): Promise<Affiliation> {
  const now = new Date();
  const [result] = await connection('affiliations')
    .where({ id })
    .update({
      membershipStatus: MembershipStatus.Active,
      updatedAt: now
    }, ['*']);
  if (!result) {
    throw new Error('unable to approve affiliation');
  }
  return result;
}

export async function deleteAffiliation(connection: Connection, id: Id): Promise<Affiliation> {
  const now = new Date();
  const [result] = await connection('affiliations')
    .where({ id })
    .update({
      membershipStatus: MembershipStatus.Inactive,
      updatedAt: now
    }, ['*']);
  if (!result) {
    throw new Error('unable to delete affiliation');
  }
  return result;
}

export async function isUserOwnerOfOrg(connection: Connection, user: User, orgId: Id): Promise<boolean> {
  if (!user) {
    return false;
  }
  const result = await connection('affiliations')
    .where ({ user: user.id, organization: orgId, membershipType: MembershipType.Owner })
    .first();

  return !!result;
}

export async function readActiveOwnerCount(connection: Connection, orgId: Id): Promise<number> {
  const result = await connection('affiliations')
    .where({ organization: orgId, membershipType: MembershipType.Owner, membershipStatus: MembershipStatus.Active });
  return result ? result.length : 0;
}

export async function readOneFileById(connection: Connection, id: Id): Promise<FileRecord> {
  const result = await connection('files')
    .where({ id })
    .first();
  return result ? result : null;
}

export async function readOneFileBlob(connection: Connection, hash: string): Promise<FileBlob> {
  const result = await connection('fileBlobs')
    .where({ hash })
    .first();
  return result || null;
}

export async function createFile(connection: Connection, fileRecord: ValidatedFileCreateRequestBody, userId: Id): Promise<FileRecord> {
  const now = new Date();
  return await connection.transaction(async trx => {
    const fileData: Buffer = await new Promise((resolve, reject) => {
      readFile(fileRecord.path, (err, data) => {
        if (err) {
          reject(new Error('error reading file'));
        }
        resolve(data);
      });
    });
    const fileHash = await hashFile(fileRecord.name, fileData);
    let fileBlob = await readOneFileBlob(connection, fileHash);
    // Create a new blob if it doesn't already exist.
    if (!fileBlob) {
      [fileBlob] = await connection('fileBlobs')
        .transacting(trx)
        .insert({
          hash: fileHash,
          blob: fileData
        }, ['*']);
    }
    // Insert the file record.
    const [file] = await connection('files')
      .transacting(trx)
      .insert({
        name: fileRecord.name,
        id: generateUuid(),
        createdAt: now,
        createdBy: userId,
        fileBlob: fileBlob.hash
      }, ['*']);

    // Insert values for permissions defined in metadata
    // TODO this will fail if permissions aren't experessed as a set (may have duplicate perms)
    for (const permission of fileRecord.permissions) {
      switch (permission.tag) {
        case 'any':
          await connection('filePermissionsPublic')
            .transacting(trx)
            .insert({
              file: file.id
            });
          break;

        case 'user':
          await connection('filePermissionsUser')
            .transacting(trx)
            .insert({
              user: permission.value,
              file: file.id
            });
          break;

        case 'userType':
          await connection('filePermissionsUserType')
            .transacting(trx)
            .insert({
              userType: permission.value,
              file: file.id
            });
          break;
      }
    }

    return file;
  });
}

export async function hasFilePermission(connection: Connection, session: Session, id: string): Promise<boolean> {
  const query = connection('files')
    .where({ id });

  if (!session.user) {
    query
      .innerJoin('filePermissionsPublic as p', 'p.file', '=', 'files.id');
  } else {
    query
      .innerJoin('filePermissionsPublic as p', 'p.file', '=', 'files.id')
      .leftOuterJoin('filePermissionsUser as u', 'u.file', '=', 'files.id')
      .leftOuterJoin('filePermissionsUserType as ut', 'ut.file', '=', 'files.id')
      .where({ 'u.user': session.user.id })
      .orWhere({ 'ut.userType': session.user.type })
      .orWhere({ 'files.createdBy': session.user.id });
  }

  const results = await query;
  return results.length > 0;
}
