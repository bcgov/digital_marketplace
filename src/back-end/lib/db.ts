import { generateUuid } from 'back-end/lib';
import { ValidatedCreateRequestBody as ValidatedAffiliationCreateRequestBody } from 'back-end/lib/resources/affiliation';
import { hashFile, ValidatedCreateRequestBody as ValidatedFileCreateRequestBody } from 'back-end/lib/resources/file';
import { ValidatedCreateRequestBody as ValidatedOrgCreateRequestBody, ValidatedUpdateRequestBody as ValidatedOrgUpdateRequestBody } from 'back-end/lib/resources/organization';
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

export async function updateUser(connection: Connection, userInfo: Omit<Partial<User>, 'avatarImageFile'> & { id: Id, avatarImageFile?: Id }): Promise<User> {
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
  const avatarImageFile = fileId && await readOneFileById(connection, fileId) || undefined;
  return {
    ...restOfRawUser,
    avatarImageFile
  };
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

export async function updateSession(connection: Connection, session: Session): Promise<Session> {
  const [result] = await connection('sessions')
    .where({ id: session.id })
    .update({
      ...session,
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

interface RawOrganization extends Omit<Organization, 'logoImageFile' | 'owner'> {
  logoImageFile: Id;
  ownerId: Id;
  ownerName: string;
}

export async function rawOrganizationToOrganization(connection: Connection, raw: RawOrganization): Promise<Organization> {
  const { logoImageFile, ownerId, ownerName, ...restOfRawOrg } = raw;
  const fetchedLogoFile = logoImageFile && await readOneFileById(connection, logoImageFile) || undefined;
  return {
    ...restOfRawOrg,
    logoImageFile: fetchedLogoFile,
    owner: {
      id: ownerId,
      name: ownerName
    }
  };
}

interface RawOrganizationSlim extends Omit<OrganizationSlim, 'logoImageFile' | 'owner'> {
  logoImageFile?: Id;
  ownerId?: Id;
  ownerName?: string;
}

export async function rawOrganizationSlimToOrganizationSlim(connection: Connection, raw: RawOrganizationSlim): Promise<OrganizationSlim> {
  const { logoImageFile, ownerId, ownerName, ...restOfRawOrg } = raw;
  const fetchedLogoFile = logoImageFile && await readOneFileById(connection, logoImageFile) || undefined;
  return {
    ...restOfRawOrg,
    logoImageFile: fetchedLogoFile,
    owner: ownerId && ownerName
      ? { id: ownerId, name: ownerName }
      : undefined
  };
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
    .select('organizations.id', 'legalName', 'logoImageFile')
    .where({ active: true });
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
    return await rawOrganizationSlimToOrganizationSlim(connection, raw);
  }));
}

export async function createOrganization(connection: Connection, user: Id, organization: ValidatedOrgCreateRequestBody): Promise<Organization> {
  const now = new Date();
  return await connection.transaction(async trx => {
    // Create organization
    const [result] = await connection('organizations')
      .transacting(trx)
      .insert({
        ...organization,
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
    return await readOneOrganization(trx, result.id);
  });
}

export async function updateOrganization(connection: Connection, organization: Partial<ValidatedOrgUpdateRequestBody>): Promise<Organization> {
  const now = new Date();
  const [result] = await connection('organizations')
    .where({
      id: organization.id,
      active: true
    })
    .update({
      ...organization,
      updatedAt: now
    }, ['*']);
  if (!result) {
    throw new Error('unable to update organization');
  }
  return await readOneOrganization(connection, result.id, true);
}

export async function readOneOrganization(connection: Connection, id: Id, allowInactive = false): Promise<Organization> {
  const where = {
    'organizations.id': id,
    'affiliations.membershipType': MembershipType.Owner
  };
  if (!allowInactive) {
    (where as any)['organizations.active'] = true;
  }
  const result = await connection('organizations')
    .select('organizations.*', 'users.id as ownerId', 'users.name as ownerName')
    .leftOuterJoin('affiliations', 'organizations.id', '=', 'affiliations.organization')
    .leftOuterJoin('users', 'affiliations.user', '=', 'users.id')
    .where(where)
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
    })
    .andWhereNot({ membershipStatus: MembershipStatus.Inactive });

  return Promise.all(results.map(async raw => rawAffiliationToAffiliationSlim(connection, raw)));
}

export async function readOneAffiliation(connection: Connection, user: Id, organization: Id): Promise<Affiliation> {
  const result = await connection('affiliations')
    .join('organizations', 'affiliations.organization', '=', 'organizations.id')
    .select('affiliations.*')
    .where({
      'affiliations.user': user,
      'affiliations.organization': organization
    })
    .andWhereNot({ 'affiliations.membershipStatus': MembershipStatus.Inactive })
    .andWhereNot({ 'organizations.active': false })
    .orderBy('createdAt')
    .first();

  return result;
}

export async function readOneAffiliationById(connection: Connection, id: Id): Promise<Affiliation> {
  const result = await connection('affiliations')
    .join('organizations', 'affiliations.organization', '=', 'organizations.id')
    .select('affiliations.*')
    .where({ 'affiliations.id': id })
    .andWhereNot({ 'affiliations.membershipStatus': MembershipStatus.Inactive })
    .andWhereNot({ 'organizations.active': false })
    .first();

  return result;
}

interface RawAffiliationToAffiliationSlimParams {
  id: Id;
  user: Id;
  organization: Id;
  membershipType: MembershipType;
  createdAt: Date;
  updatedAt: Date;
}

export async function rawAffiliationToAffiliationSlim(connection: Connection, params: RawAffiliationToAffiliationSlimParams): Promise<AffiliationSlim> {
  const { id, organization: orgId, membershipType } = params;
  const organization = await readOneOrganization(connection, orgId);
  return {
    id,
    membershipType,
    organization: {
      id: organization.id,
      legalName: organization.legalName
    }
  };
}

export async function approveAffiliation(connection: Connection, id: Id): Promise<Affiliation> {
  const now = new Date();
  const [result] = await connection('affiliations')
    .update({
      membershipStatus: MembershipStatus.Active,
      updatedAt: now
    }, ['*'])
    .where({
      id
    })
    .whereIn('organization', function() {
      this.select('id')
          .from('organizations')
          .where({
            active: true
          });
    });
  if (!result) {
    throw new Error('unable to approve affiliation');
  }
  return result;
}

export async function deleteAffiliation(connection: Connection, id: Id): Promise<Affiliation> {
  const now = new Date();
  const [result] = await connection('affiliations')
    .update({
      membershipStatus: MembershipStatus.Inactive,
      updatedAt: now
    }, ['*'])
    .where({
      id
    })
    .whereIn('organization', function() {
      this.select('id')
          .from('organizations')
          .where({
            active: true
          });
    });
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
    .join('organizations', 'affiliations.organization', '=', 'organizations.id')
    .select('affiliations.*')
    .where({
      'affiliations.organization': orgId,
      'affiliations.membershipType': MembershipType.Owner,
      'affiliations.membershipStatus': MembershipStatus.Active,
      'organizations.active': true
    });
  return result ? result.length : 0;
}

export async function readOneFileById(connection: Connection, id: Id): Promise<FileRecord | null> {
  const result: FileRecord = await connection('files')
    .where({ id })
    .select(['name', 'id', 'createdAt', 'fileBlob'])
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
    const fileHash = hashFile(fileRecord.name, fileData);
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
      }, ['name', 'id', 'createdAt', 'fileBlob']);

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
