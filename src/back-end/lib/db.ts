import { generateUuid } from 'back-end/lib';
import { hashFile } from 'back-end/lib/resources/file';
import { readFile } from 'fs';
import Knex from 'knex';
import { Affiliation, AffiliationSlim, MembershipStatus, MembershipType } from 'shared/lib/resources/affiliation';
import { FileBlob, FilePermissions, FileRecord } from 'shared/lib/resources/file';
import { Organization, OrganizationSlim } from 'shared/lib/resources/organization';
import { Session } from 'shared/lib/resources/session';
import { User, UserType } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';
import { getValidValue, invalid, isInvalid, isValid, valid, Validation } from 'shared/lib/validation';

export type Connection = Knex;

type DatabaseValidation<Valid> = Validation<Valid, null>;

type DbFn<Arg1, Arg2, Valid> = (connection: Connection, arg1?: Arg1, arg2?: Arg2) => Promise<DatabaseValidation<Valid>>;

function tryDb<Arg1, Arg2, Valid>(fn: DbFn<Arg1, Arg2, Valid>): DbFn<Arg1, Arg2, Valid> {
  return async (connection, arg1?, arg2?) => {
    try {
      return arg1 ? (arg2 ? await fn(connection, arg1, arg2) : await fn(connection, arg1)) : await fn(connection);
    } catch (exception) {
      return invalid(null);
    }
  };
}

type CreateUserParams = Omit<Partial<User>, 'avatarImageFile'> & { createdAt?: Date, updatedAt?: Date, avatarImageFile?: Id };

export const createUser = tryDb<CreateUserParams, null, User>(async (connection, user) => {
  const now = new Date();
  const [result] = await connection<RawUserToUserParams>('users')
    .insert({
      ...user,
      id: generateUuid(),
      createdAt: now,
      updatedAt: now
    } as CreateUserParams, '*');
  if (!result) {
    throw new Error('unable to create user');
  }
  return valid(await rawUserToUser(connection, result));
});

type UpdateUserParams = Omit<Partial<User>, 'avatarImageFile'> & { updatedAt?: Date, avatarImageFile?: Id };

export const updateUser = tryDb<UpdateUserParams, null, User>(async (connection, user) => {
  const now = new Date();
  const [result] = await connection<RawUserToUserParams>('users')
  .where({ id: user && user.id })
  .update({
    ...user,
    updatedAt: now
  } as UpdateUserParams, '*');
  if (!result) {
    throw new Error('unable to update user');
  }
  return valid(await rawUserToUser(connection, result));
});

export const readOneUser = tryDb<Id, null, User | null>(async (connection, id) => {
  const result = await connection<RawUserToUserParams>('users')
    .where({ id })
    .first();
  return valid(result ? await rawUserToUser(connection, result) : null);
});

export const readManyUsers = tryDb<null, null, User[]>(async (connection) => {
  const results = await connection<RawUserToUserParams>('users').select();
  return valid(await Promise.all(results.map(async raw => await rawUserToUser(connection, raw))));
});

interface RawUserToUserParams extends Omit<User, 'avatarImageFile'> {
  avatarImageFile: Id | null;
}

export async function rawUserToUser(connection: Connection, params: RawUserToUserParams): Promise<User> {
  const { avatarImageFile: fileId, ...restOfRawUser } = params;
  const avatarImageFile = fileId ? getValidValue(await readOneFileById(connection, fileId), null) : null;
  return {
    ...restOfRawUser,
    avatarImageFile
  };
}

export const findOneUserByTypeAndUsername = tryDb<UserType, string, User | null>(async (connection, type, idpUsername) => {
  let query = connection<User>('users')
    .where({ type, idpUsername });

  if (type === UserType.Government) {
    query = query.orWhere({ type: UserType.Admin });
  }
  const result = await query.first();
  return valid(result ? result : null);
});

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
    const dbResult = await readOneUser(connection, params.user);
    if (isValid(dbResult) && dbResult.value) {
      return {
        ...session,
        user: dbResult.value
      };
    }
  }
  return session;
}

export const createAnonymousSession = tryDb<null, null, Session>(async (connection) => {
  const now = new Date();
  const [result] = await connection<Session>('sessions')
    .insert({
      id: generateUuid(),
      createdAt: now,
      updatedAt: now
    } as Session, '*');
  if (!result) {
    throw new Error('unable to create anonymous session');
  }
  return valid(await rawSessionToSession(connection, {
    id: result.id
  }));
});

export const readOneSession = tryDb<Id, null, Session>(async (connection, id) => {
  const result = await connection<RawSessionToSessionParams>('sessions')
    .where({ id })
    .first();

  if (!result) { return await createAnonymousSession(connection); }
  return valid(await rawSessionToSession(connection, {
    id: result.id,
    accessToken: result.accessToken,
    user: result.user
  }));
});

type UpdateSessionParams = Omit<Session, 'user'> & { user: Id, updatedAt?: Date };

export const updateSession = tryDb<UpdateSessionParams, null, Session>(async (connection, session) => {
  const now = new Date();
  const [result] = await connection<UpdateSessionParams>('sessions')
    .where({ id: session && session.id })
    .update({
      ...session,
      updatedAt: now
    } as UpdateSessionParams, '*');
  if (!result) {
    throw new Error('unable to update session');
  }
  return valid(await rawSessionToSession(connection, {
    id: result.id,
    accessToken: result.accessToken,
    user: result.user
  }));
});

export const deleteSession = tryDb<Id, null, null>(async (connection, id) => {
  await connection('sessions')
    .where({ id })
    .delete();
  return valid(null);
});

interface RawOrganization extends Omit<Organization, 'logoImageFile' | 'owner'> {
  logoImageFile: Id;
  ownerId: Id;
  ownerName: string;
}

async function rawOrganizationToOrganization(connection: Connection, raw: RawOrganization): Promise<Organization> {
  const { logoImageFile, ownerId, ownerName, ...restOfRawOrg } = raw;
  let fetchedLogoFile: FileRecord | undefined;
  if (logoImageFile) {
    const dbResult = await readOneFileById(connection, logoImageFile);
    if (isInvalid(dbResult) || !dbResult.value) {
      throw new Error('Database error');
    }
    fetchedLogoFile = dbResult.value;
  }
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

async function rawOrganizationSlimToOrganizationSlim(connection: Connection, raw: RawOrganizationSlim): Promise<OrganizationSlim> {
  const { logoImageFile, ownerId, ownerName, ...restOfRawOrg } = raw;
  let fetchedLogoImageFile: FileRecord | undefined;
  if (logoImageFile) {
    const dbResult = await readOneFileById(connection, logoImageFile);
    if (isInvalid(dbResult) || !dbResult.value) {
      throw new Error('Database error');
    }
    fetchedLogoImageFile = dbResult.value;
  }
  return {
    ...restOfRawOrg,
    logoImageFile: fetchedLogoImageFile,
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
export const readManyOrganizations = tryDb<Session, null, OrganizationSlim[]>(async (connection, session) => {
  const query = connection('organizations')
    .select('organizations.id', 'legalName', 'logoImageFile')
    .where({ active: true });
  // If a user is attached to this session, we need to add owner info to some or all of the orgs
  if (session && session.user && (session.user.type === UserType.Admin || session.user.type === UserType.Vendor)) {
    query
      .select('users.id as ownerId', 'users.name as ownerName')
      .leftOuterJoin('affiliations', 'organizations.id', '=', 'affiliations.organization')
      .leftOuterJoin('users', 'affiliations.user', '=', 'users.id')
      .andWhere({ 'affiliations.membershipType': MembershipType.Owner });
  }
  const results = await query as RawOrganizationSlim[];
  // Only include ownership information for vendors' owned organizations.
  return valid(await Promise.all(results.map(async raw => {
    if (session && session.user && session.user.type === UserType.Vendor && raw.ownerId !== session.user.id) {
      raw = {
        ...raw,
        ownerId: undefined,
        ownerName: undefined
      };
    }
    return await rawOrganizationSlimToOrganizationSlim(connection, raw);
  })));
});

type CreateOrganizationParams = Partial<Omit<Organization, 'logoImageFile'>> & { logoImageFile?: Id };

export const createOrganization = tryDb<Id, CreateOrganizationParams, Organization>(async (connection, user, organization) => {
  const now = new Date();
  const result: RawOrganization = await connection.transaction(async trx => {
    // Create organization
    const [result] = await connection<CreateOrganizationParams>('organizations')
      .transacting(trx)
      .insert({
        ...organization,
        id: generateUuid(),
        active: true,
        createdAt: now,
        updatedAt: now
      } as CreateOrganizationParams, ['*']);
    if (!result || !user) {
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
  const dbResult = await readOneOrganization(connection, result.id);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error('unable to create organization');
  }
  return valid(dbResult.value);
});

type UpdateOrganizationParams = Partial<Omit<Organization, 'logoImageFile'>> & { logoImageFile?: Id };

export const updateOrganization = tryDb<UpdateOrganizationParams, null, Organization>(async (connection, organization) => {
  const now = new Date();
  const [result] = await connection<UpdateOrganizationParams>('organizations')
    .where({
      id: organization && organization.id,
      active: true
    })
    .update({
      ...organization,
      updatedAt: now
    } as UpdateOrganizationParams, '*');
  if (!result || !result.id) {
    throw new Error('unable to update organization');
  }
  const dbResult = await readOneOrganization(connection, result.id, true);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error('unable to update organization');
  }
  return valid(dbResult.value);
});

export const readOneOrganization = tryDb<Id, boolean, Organization | null>(async (connection, id, allowInactive = false) => {
  const where = {
    'organizations.id': id,
    'affiliations.membershipType': MembershipType.Owner
  };
  if (!allowInactive) {
    (where as any)['organizations.active'] = true;
  }
  const result = await connection<RawOrganization>('organizations')
    .select('organizations.*', 'users.id as ownerId', 'users.name as ownerName')
    .leftOuterJoin('affiliations', 'organizations.id', '=', 'affiliations.organization')
    .leftOuterJoin('users', 'affiliations.user', '=', 'users.id')
    .where(where)
    .first() as RawOrganization;
  return valid(result ? await rawOrganizationToOrganization(connection, result) : null);
});

type CreateAffiliationParams = Partial<Omit<Affiliation, 'user' | 'organization'>> & { user: Id, organization: Id };

export const createAffiliation = tryDb<CreateAffiliationParams, null, Affiliation>(async (connection, affiliation) => {
  const now = new Date();
  if (!affiliation) {
    throw new Error('unable to create affiliation');
  }
  return await connection.transaction(async trx => {
    const [result] = await connection<RawAffiliation>('affiliations')
      .transacting(trx)
      .insert({
        ...affiliation,
        id: generateUuid(),
        createdAt: now,
        updatedAt: now
      } as RawAffiliation, '*');

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
        membershipStatus: MembershipStatus.Inactive,
        updatedAt: now
      });
    return valid(await rawAffiliationToAffiliation(connection, result));
  });
});

export const readManyAffiliations = tryDb<Id, null, AffiliationSlim[]>(async (connection, userId) => {
    const results: RawAffiliation[] = await connection<RawAffiliation>('affiliations')
      .join('organizations', 'affiliations.organization', '=', 'organizations.id')
      .select('affiliations.*')
      .where({
        'affiliations.user': userId,
        'organizations.active': true
      })
      .andWhereNot({ membeshipStatus: MembershipStatus.Inactive });
    return valid(await Promise.all(results.map(async raw => await rawAffiliationToAffiliationSlim(connection, raw))));
});

export const readOneAffiliation = tryDb<Id, Id, Affiliation | null>(async (connection, user, organization) => {
  const result = await connection<RawAffiliation>('affiliations')
    .join('organizations', 'affiliations.organization', '=', 'organizations.id')
    .select<RawAffiliation>('affiliations.*')
    .where({
      'affiliations.user': user,
      'affiliations.organization': organization
    })
    .andWhereNot({
      'affiliations.membershipStatus': MembershipStatus.Inactive,
      'organizations.active': false
    })
    .orderBy('createdAt')
    .first();

  return valid(result ? await rawAffiliationToAffiliation(connection, result) : null);
});

export const readOneAffiliationById = tryDb<Id, null, Affiliation | null>(async (connection, id) => {
  const result = await connection<RawAffiliation>('affiliations')
    .join('organizations', 'affiliations.organization', '=', 'organizations.id')
    .select<RawAffiliation>('affiliations.*')
    .where({ 'affiliations.id': id })
    .andWhereNot({
      'affiliations.membershipStatus': MembershipStatus.Inactive,
      'organizations.active': false
    })
    .first();

  return valid(result ? await rawAffiliationToAffiliation(connection, result) : null);
});

interface RawAffiliation {
  id: Id;
  user: Id;
  organization: Id;
  membershipType: MembershipType;
  membershipStatus: MembershipStatus;
  createdAt: Date;
  updatedAt: Date;
}

async function rawAffiliationToAffiliationSlim(connection: Connection, params: RawAffiliation): Promise<AffiliationSlim> {
  const { id, organization: orgId, membershipType } = params;
  const organization = getValidValue(await readOneOrganization(connection, orgId), null);
  if (!organization) {
    throw new Error(); // Will be caught by calling function
  }
  return {
    id,
    membershipType,
    organization: {
      id: organization.id,
      legalName: organization.legalName
    }
  };
}

async function rawAffiliationToAffiliation(connection: Connection, params: RawAffiliation): Promise<Affiliation> {
  const { user: userId, organization: orgId } = params;
  const organization = getValidValue(await readOneOrganization(connection, orgId), null);
  const user = getValidValue(await readOneUser(connection, userId), null);
  if (!user || !organization) {
    throw new Error(); // Will be caught by calling function
  }
  return {
    ...params,
    user,
    organization
  };
}

export const approveAffiliation = tryDb<Id, null, Affiliation>(async (connection, id) => {
  const now = new Date();
  const [result] = await connection<RawAffiliation>('affiliations')
    .update({
      membershipStatus: MembershipStatus.Active,
      updatedAt: now
    } as RawAffiliation, '*')
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
  return valid(await rawAffiliationToAffiliation(connection, result));
});

export const deleteAffiliation = tryDb<Id, null, Affiliation>(async (connection, id) => {
  const now = new Date();
  const [result] = await connection<RawAffiliation>('affiliations')
    .update({
      membershipStatus: MembershipStatus.Inactive,
      updatedAt: now
    } as RawAffiliation, '*')
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
  return valid(await rawAffiliationToAffiliation(connection, result));
});

export async function isUserOwnerOfOrg(connection: Connection, user: User, orgId: Id): Promise<boolean> {
  if (!user) {
    return false;
  }
  const result = await connection<RawAffiliation>('affiliations')
    .where ({ user: user.id, organization: orgId, membershipType: MembershipType.Owner })
    .first();

  return !!result;
}

export async function readActiveOwnerCount(connection: Connection, orgId: Id): Promise<number> {
  try {
    const result = await connection('affiliations')
    .join('organizations', 'affiliations.organization', '=', 'organizations.id')
    .select<RawAffiliation[]>('affiliations.*')
    .where({
      'affiliations.organization': orgId,
      'affiliations.membershipType': MembershipType.Owner,
      'affiliations.membershipStatus': MembershipStatus.Active,
      'organizations.active': true
    });
    return result ? result.length : 0;
  } catch (exception) {
    return 0;
  }
}

export const readOneFileById = tryDb<Id, null, FileRecord | null>(async (connection, id) => {
  const result = await connection<FileRecord>('files')
    .where({ id })
    .select(['name', 'id', 'createdAt', 'fileBlob'])
    .first();
  return valid(result ? result : null);
});

export const readOneFileBlob = tryDb<string, null, FileBlob | null>(async (connection, hash) => {
  const result = await connection<FileBlob>('fileBlobs')
    .where({ hash })
    .first();
  return valid(result || null);
});

type CreateFileParams = Partial<FileRecord> & { path: string, permissions: Array<FilePermissions<Id, UserType>> };

export const createFile = tryDb<CreateFileParams, Id, FileRecord>(async (connection, fileRecord, userId) => {
  const now = new Date();
  if (!fileRecord) {
    throw new Error();
  }
  return valid(await connection.transaction(async trx => {
    const fileData: Buffer = await new Promise((resolve, reject) => {
      readFile(fileRecord.path, (err, data) => {
        if (err) {
          reject(new Error('error reading file'));
        }
        resolve(data);
      });
    });
    if (!fileRecord.name) {
      throw new Error();
    }
    const fileHash = hashFile(fileRecord.name, fileData);
    const dbResult = await readOneFileBlob(connection, fileHash);
    if (isInvalid(dbResult)) {
      throw new Error('Database error');
    }
    let fileBlob = dbResult.value;
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
    const [file]: FileRecord[] = await connection('files')
      .transacting(trx)
      .insert({
        name: fileRecord.name,
        id: generateUuid(),
        createdAt: now,
        createdBy: userId,
        fileBlob: fileBlob && fileBlob.hash
      }, ['name', 'id', 'createdAt', 'fileBlob']);

    // Insert values for permissions defined in metadata
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
  }));
});

export async function hasFilePermission(connection: Connection, session: Session, id: string): Promise<boolean> {
  try {
    const query = connection<FileRecord>('files')
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
  } catch (exception) {
    return false;
  }
}
