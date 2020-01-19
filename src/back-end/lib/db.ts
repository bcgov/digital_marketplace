import { generateUuid } from 'back-end/lib';
import { ValidatedCreateRequestBody as ValidatedAffiliationCreateRequestBody } from 'back-end/lib/resources/affiliation';
import { hashFile, ValidatedCreateRequestBody as ValidatedFileCreateRequestBody } from 'back-end/lib/resources/file';
import { ValidatedCreateRequestBody as ValidatedOrgCreateRequestBody, ValidatedUpdateRequestBody as ValidatedOrgUpdateRequestBody } from 'back-end/lib/resources/organization';
import { readFile } from 'fs';
import Knex from 'knex';
import { Affiliation, AffiliationSlim, MembershipStatus, MembershipType } from 'shared/lib/resources/affiliation';
import { FileBlob, FilePermissions, FileRecord } from 'shared/lib/resources/file';
import { Organization, OrganizationSlim } from 'shared/lib/resources/organization';
import { Session } from 'shared/lib/resources/session';
import { User, UserType } from 'shared/lib/resources/user';
import { adt, Id } from 'shared/lib/types';
import { invalid, isInvalid, isValid, valid } from 'shared/lib/validation';
import { DatabaseValidation } from 'shared/lib/validation/db';

export type Connection = Knex<any, any>;

const createDatabaseError = () => adt('databaseError' as const);

export async function createUser(connection: Connection, user: Omit<User, 'id' | 'notificationsOn' | 'acceptedTerms'>): Promise<DatabaseValidation<User>> {
  const now = new Date();
  try {
    const [result]: RawUserToUserParams[] = await connection('users')
      .insert({
        ...user,
        id: generateUuid(),
        createdAt: now,
        updatedAt: now
      }, ['*']);
    if (!result) {
      throw new Error('unable to create user');
    }
    return valid(await rawUserToUser(connection, result));
  } catch (exception) {
    return invalid(createDatabaseError());
  }
}

export async function updateUser(connection: Connection, userInfo: Omit<Partial<User>, 'avatarImageFile'> & { id: Id, avatarImageFile?: Id }): Promise<DatabaseValidation<User>> {
  const now = new Date();
  try {
    const [result]: RawUserToUserParams[] = await connection('users')
      .where({ id: userInfo.id })
      .update({
        ...userInfo,
        updatedAt: now
      }, ['*']);
    if (!result) {
      throw new Error('unable to update user');
    }
    return valid(await rawUserToUser(connection, result));
  } catch (exception) {
    return invalid(createDatabaseError());
  }
}

export async function readOneUser(connection: Connection, id: Id): Promise<DatabaseValidation<User | null>> {
  try {
    const result: RawUserToUserParams = await connection('users')
      .where({ id })
      .first();
    return valid(result ? await rawUserToUser(connection, result) : null);
  } catch (exception) {
    return invalid(createDatabaseError());
  }
}

export async function readManyUsers(connection: Connection): Promise<DatabaseValidation<User[]>> {
  try {
    const results: RawUserToUserParams[] = await connection('users').select();
    return valid(await Promise.all(results.map(async raw => await rawUserToUser(connection, raw))));
  } catch (exception) {
    return invalid(createDatabaseError());
  }
}

interface RawUserToUserParams extends Omit<User, 'avatarImageFile'> {
  avatarImageFile: Id;
}

export async function rawUserToUser(connection: Connection, params: RawUserToUserParams): Promise<User> {
  const { avatarImageFile, ...restOfRawUser } = params;
  let fetchedAvatarImageFile: FileRecord | undefined;
  if (avatarImageFile) {
    const dbResult = await readOneFileById(connection, avatarImageFile);
    if (isInvalid(dbResult) || !dbResult.value) {
      throw new Error('Database error');
    }
    fetchedAvatarImageFile = dbResult.value;
  }
  return {
    ...restOfRawUser,
    avatarImageFile: fetchedAvatarImageFile
  };
}

export async function findOneUserByTypeAndUsername(connection: Connection, type: UserType, idpUsername: string): Promise<DatabaseValidation<User | null>> {
  try {
    let query = connection('users')
      .where({ type, idpUsername });

    if (type === UserType.Government) {
      query = query.orWhere({ type: UserType.Admin });
    }
    const result = await query.first();
    return valid(result || null);
  } catch (exception) {
    return invalid(createDatabaseError());
  }
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

export async function createAnonymousSession(connection: Connection): Promise<DatabaseValidation<Session>> {
  const now = new Date();
  try {
    const [result]: Session[] = await connection('sessions')
      .insert({
        id: generateUuid(),
        createdAt: now,
        updatedAt: now
      }, ['*']);
    if (!result) {
      throw new Error('unable to create anonymous session');
    }
    return valid(await rawSessionToSession(connection, {
      id: result.id
    }));
  } catch (exception) {
    return invalid(adt('databaseError' as const));
  }
}

export async function readOneSession(connection: Connection, id: Id): Promise<DatabaseValidation<Session>> {
  try {
    const result: RawSessionToSessionParams = await connection('sessions')
      .where({ id })
      .first();

    if (!result) { return await createAnonymousSession(connection); }
    return valid(await rawSessionToSession(connection, {
      id: result.id,
      accessToken: result.accessToken,
      user: result.user
    }));
  } catch (exception) {
    return invalid(createDatabaseError());
  }
}

export async function updateSession(connection: Connection, session: Session): Promise<DatabaseValidation<Session>> {
  try {
    const [result]: RawSessionToSessionParams[] = await connection('sessions')
      .where({ id: session.id })
      .update({
        ...session,
        updatedAt: new Date()
      }, ['*']);
    if (!result) {
      throw new Error('unable to update session');
    }
    return valid(await rawSessionToSession(connection, {
      id: result.id,
      accessToken: result.accessToken,
      user: result.user
    }));
  } catch (exception) {
    return invalid(createDatabaseError());
  }
}

export async function deleteSession(connection: Connection, id: Id): Promise<DatabaseValidation<null>> {
  try {
    await connection('sessions')
      .where({ id })
      .delete();
    return valid(null);
  } catch (exception) {
    return invalid(createDatabaseError());
  }
}

interface RawOrganization extends Omit<Organization, 'logoImageFile' | 'owner'> {
  logoImageFile: Id;
  ownerId: Id;
  ownerName: string;
}

export async function rawOrganizationToOrganization(connection: Connection, raw: RawOrganization): Promise<Organization> {
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

export async function rawOrganizationSlimToOrganizationSlim(connection: Connection, raw: RawOrganizationSlim): Promise<OrganizationSlim> {
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

export async function readManyOrganizations(connection: Connection, session: Session): Promise<DatabaseValidation<OrganizationSlim[]>> {
  try {
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
    const results: RawOrganizationSlim[] = await query;
    // Only include ownership information for vendors' owned organizations.
    return valid(await Promise.all(results.map(async raw => {
      if (session.user && session.user.type === UserType.Vendor && raw.ownerId !== session.user.id) {
        raw = {
          ...raw,
          ownerId: undefined,
          ownerName: undefined
        };
      }
      return await rawOrganizationSlimToOrganizationSlim(connection, raw);
    })));
  } catch (exception) {
    return invalid(createDatabaseError());
  }
}

export async function createOrganization(connection: Connection, user: Id, organization: ValidatedOrgCreateRequestBody): Promise<DatabaseValidation<Organization>> {
  const now = new Date();
  const result: RawOrganization = await connection.transaction(async trx => {
    // Create organization
    const [result]: RawOrganization[] = await connection('organizations')
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
    return result;
  });
  return valid(await rawOrganizationToOrganization(connection, result));
}

export async function updateOrganization(connection: Connection, organization: Partial<ValidatedOrgUpdateRequestBody>): Promise<DatabaseValidation<Organization>> {
  const now = new Date();
  try {
    const [result]: RawOrganization[] = await connection('organizations')
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
    return valid(await rawOrganizationToOrganization(connection, result));
  } catch (exception) {
    return invalid(createDatabaseError());
  }
}

export async function readOneOrganization(connection: Connection, id: Id, allowInactive = false): Promise<DatabaseValidation<Organization | null>> {
  try {
    const where = {
      'organizations.id': id,
      'affiliations.membershipType': MembershipType.Owner
    };
    if (!allowInactive) {
      (where as any)['organizations.active'] = true;
    }
    const result: RawOrganization = await connection('organizations')
      .select('organizations.*', 'users.id as ownerId', 'users.name as ownerName')
      .leftOuterJoin('affiliations', 'organizations.id', '=', 'affiliations.organization')
      .leftOuterJoin('users', 'affiliations.user', '=', 'users.id')
      .where(where)
      .first();
    return valid(result ? await rawOrganizationToOrganization(connection, result) : null);
  } catch (exception) {
    return invalid(createDatabaseError());
  }
}

export async function createAffiliation(connection: Connection, affiliation: ValidatedAffiliationCreateRequestBody): Promise<DatabaseValidation<Affiliation>> {
  const now = new Date();
  try {
    return await connection.transaction(async trx => {
      const [result]: Affiliation[]  = await connection('affiliations')
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
      return valid(result);
    });
  } catch (exception) {
    return invalid(createDatabaseError());
  }
}

export async function readManyAffiliations(connection: Connection, userId: Id): Promise<DatabaseValidation<AffiliationSlim[]>> {
  try {
    const results: RawAffiliationToAffiliationSlimParams[] = await connection('affiliations')
      .join('organizations', 'affiliations.organization', '=', 'organizations.id')
      .select('affiliations.*')
      .where({
        'affiliations.user': userId,
        'organizations.active': true
      })
      .andWhereNot({ membershipStatus: MembershipStatus.Inactive });
    return valid(await Promise.all(results.map(async raw => rawAffiliationToAffiliationSlim(connection, raw))));
  } catch (exception) {
    return invalid(createDatabaseError());
  }
}

export async function readOneAffiliation(connection: Connection, user: Id, organization: Id): Promise<DatabaseValidation<Affiliation | null>> {
  try {
    const result: Affiliation = await connection('affiliations')
      .join('organizations', 'affiliations.organization', '=', 'organizations.id')
      .select('affiliations.*')
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

    return valid(result || null);
  } catch (exception) {
    return invalid(createDatabaseError());
  }
}

export async function readOneAffiliationById(connection: Connection, id: Id): Promise<DatabaseValidation<Affiliation | null>> {
  try {
    const result: Affiliation = await connection('affiliations')
      .join('organizations', 'affiliations.organization', '=', 'organizations.id')
      .select('affiliations.*')
      .where({ 'affiliations.id': id })
      .andWhereNot({
        'affiliations.membershipStatus': MembershipStatus.Inactive,
        'organizations.active': false
      })
      .first();

    return valid(result || null);
  } catch (exception) {
    return invalid(createDatabaseError());
  }
}

interface RawAffiliationToAffiliationSlimParams {
  id: Id;
  user: Id;
  organization: Id;
  membershipType: MembershipType;
  createdAt: Date;
  updatedAt: Date;
}

async function rawAffiliationToAffiliationSlim(connection: Connection, params: RawAffiliationToAffiliationSlimParams): Promise<AffiliationSlim> {
  const { id, organization: orgId, membershipType } = params;
  const dbResult = await readOneOrganization(connection, orgId);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error('Database error'); // error will be caught be calling function
  }
  const organization = dbResult.value;
  return {
    id,
    membershipType,
    organization: {
      id: organization.id,
      legalName: organization.legalName
    }
  };
}

export async function approveAffiliation(connection: Connection, id: Id): Promise<DatabaseValidation<Affiliation>> {
  const now = new Date();
  try {
    const [result]: Affiliation[] = await connection('affiliations')
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
    return valid(result);
  } catch (exception) {
    return invalid(createDatabaseError());
  }
}

export async function deleteAffiliation(connection: Connection, id: Id): Promise<DatabaseValidation<Affiliation>> {
  const now = new Date();
  try {
    const [result]: Affiliation[] = await connection('affiliations')
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
    return valid(result);
  } catch (exception) {
    return invalid(createDatabaseError());
  }
}

export async function isUserOwnerOfOrg(connection: Connection, user: User, orgId: Id): Promise<boolean> {
  try {
    if (!user) {
      return false;
    }
    const result = await connection('affiliations')
      .where ({ user: user.id, organization: orgId, membershipType: MembershipType.Owner })
      .first();

    return !!result;
  } catch (exception) {
    return false; // If something goes wrong, fallback to false as this function is used for validating permissions.
  }
}

export async function readActiveOwnerCount(connection: Connection, orgId: Id): Promise<number> {
  try {
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
  } catch (exception) {
    return 0;
  }
}

export async function readOneFileById(connection: Connection, id: Id): Promise<DatabaseValidation<FileRecord | null>> {
  try {
    const result: FileRecord = await connection('files')
      .where({ id })
      .select(['name', 'id', 'createdAt', 'fileBlob'])
      .first();
    return valid(result || null);
  } catch (exception) {
    return invalid(createDatabaseError());
  }
}

export async function readOneFileBlob(connection: Connection, hash: string): Promise<DatabaseValidation<FileBlob | null>> {
  try {
    const result: FileBlob = await connection('fileBlobs')
      .where({ hash })
      .first();
    return valid(result || null);
  } catch (exception) {
    return invalid(createDatabaseError());
  }
}

export async function createFile(connection: Connection, fileRecord: ValidatedFileCreateRequestBody, userId: Id): Promise<DatabaseValidation<FileRecord>> {
  const now = new Date();
  try {
    return valid(await connection.transaction(async trx => {
      const fileData: Buffer = await new Promise((resolve, reject) => {
        readFile(fileRecord.path, (err, data) => {
          if (err) {
            reject(new Error('error reading file'));
          }
          resolve(data);
        });
      });
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
  } catch (exception) {
    return invalid(createDatabaseError());
  }
}

export async function hasFilePermission(connection: Connection, session: Session, id: string): Promise<boolean> {
  try {
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

    const results: Array<FilePermissions<Id, UserType>> = await query;
    return results.length > 0;
  } catch (exception) {
    return false;
  }
}
