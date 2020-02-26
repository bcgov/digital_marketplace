import { generateUuid } from 'back-end/lib';
import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import { readCWUProposalScore, readOneCWUProposal as hasReadPermissionCWUProposal } from 'back-end/lib/permissions';
import { hashFile } from 'back-end/lib/resources/file';
import { readFile } from 'fs';
import Knex from 'knex';
import { Addendum } from 'shared/lib/resources/addendum';
import { Affiliation, AffiliationSlim, MembershipStatus, MembershipType } from 'shared/lib/resources/affiliation';
import { FileBlob, FilePermissions, FileRecord } from 'shared/lib/resources/file';
import { CreateCWUOpportunityStatus, CWUOpportunity, CWUOpportunityEvent, CWUOpportunityHistoryRecord, CWUOpportunitySlim, CWUOpportunityStatus, privateOpportunitiesStatuses, publicOpportunityStatuses } from 'shared/lib/resources/opportunity/code-with-us';
import { Organization, OrganizationSlim } from 'shared/lib/resources/organization';
import { CreateCWUProposalStatus, CreateIndividualProponentRequestBody, CWUIndividualProponent, CWUProposal, CWUProposalEvent, CWUProposalHistoryRecord, CWUProposalSlim, CWUProposalStatus, isRankableCWUProposalStatus, UpdateProponentRequestBody } from 'shared/lib/resources/proposal/code-with-us';
import { AuthenticatedSession, Session } from 'shared/lib/resources/session';
import { CWUOpportunitySubscriber } from 'shared/lib/resources/subscribers/code-with-us';
import { User, UserSlim, UserStatus, UserType } from 'shared/lib/resources/user';
import { adt, ADT, Id } from 'shared/lib/types';
import { getValidValue, invalid, isInvalid, isValid, valid, Validation } from 'shared/lib/validation';

const logger = makeDomainLogger(consoleAdapter, 'back-end');

export type Connection = Knex;

type Transaction = Knex.Transaction;

export const ERROR_MESSAGE = 'Database error.';

type DatabaseValidation<Valid> = Validation<Valid, null>;

type DbFn<Args extends unknown[], Valid> = (connection: Connection, ...args: Args) => Promise<DatabaseValidation<Valid>>;

function tryDb<Args extends unknown[], Valid>(fn: DbFn<Args, Valid>): DbFn<Args, Valid> {
  return async (connection, ...args) => {
    try {
      return await fn(connection, ...args);
    } catch (e) {
      logger.error('database operation failed', {
        message: e.message,
        stack: e.stack
      });
      return invalid(null);
    }
  };
}

type CreateUserParams = Omit<Partial<User>, 'avatarImageFile'> & { createdAt?: Date, updatedAt?: Date, avatarImageFile?: Id };

export const createUser = tryDb<[CreateUserParams], User>(async (connection, user) => {
  const now = new Date();
  const [result] = await connection<RawUser>('users')
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

export const updateUser = tryDb<[UpdateUserParams], User>(async (connection, user) => {
  const now = new Date();
  const [result] = await connection<RawUser>('users')
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

export const readOneUser = tryDb<[Id], User | null>(async (connection, id) => {
  const result = await connection<RawUser>('users')
    .where({ id })
    .first();
  return valid(result ? await rawUserToUser(connection, result) : null);
});

export const readOneUserByEmail = tryDb<[string, boolean?], User | null>(async (connection, email, allowInactive = false) => {
  const where = {
    email,
    status: (allowInactive ? '*' : UserStatus.Active)
  };
  const result: RawUser = await connection('users')
    .where(where)
    .first();
  return valid(result ? await rawUserToUser(connection, result) : null);
});

export const readOneUserSlim = tryDb<[Id], UserSlim | null>(async (connection, id) => {
  const result = await connection<UserSlim>('users')
    .where({ id })
    .select('id', 'name')
    .first();
  return valid(result ? result : null);
});

export const readManyUsers = tryDb<[], User[]>(async (connection) => {
  const results = await connection<RawUser>('users').select();
  return valid(await Promise.all(results.map(async raw => await rawUserToUser(connection, raw))));
});

export const readManyUsersNotificationsOn = tryDb<[], User[]>(async (connection) => {
  const results = await connection<RawUser>('users')
    .whereNotNull('notificationsOn')
    .select('*');
  return valid(await Promise.all(results.map(async raw => await rawUserToUser(connection, raw))));
});

interface RawUser extends Omit<User, 'avatarImageFile'> {
  avatarImageFile: Id | null;
}

export async function rawUserToUser(connection: Connection, params: RawUser): Promise<User> {
  const { avatarImageFile: fileId, ...restOfRawUser } = params;
  const avatarImageFile = fileId ? getValidValue(await readOneFileById(connection, fileId), null) : null;
  return {
    ...restOfRawUser,
    avatarImageFile
  };
}

export const findOneUserByTypeAndUsername = tryDb<[UserType.Vendor | UserType.Government, string], User | null>(async (connection, userType, idpUsername) => {
  const query = connection<User>('users')
    .where({ type: userType, idpUsername })
    // Support querying admin statuses even if the desired user could be a vendor.
    // This is useful for development purposes.
    .orWhere({ type: UserType.Admin, idpUsername });
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

export const createAnonymousSession = tryDb<[], Session>(async (connection) => {
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

export const readOneSession = tryDb<[Id], Session>(async (connection, id) => {
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

export const updateSession = tryDb<[UpdateSessionParams], Session>(async (connection, session) => {
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

export const deleteSession = tryDb<[Id], null>(async (connection, id) => {
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
      throw new Error(ERROR_MESSAGE);
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
      throw new Error(ERROR_MESSAGE);
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
export const readManyOrganizations = tryDb<[Session], OrganizationSlim[]>(async (connection, session) => {
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

export const createOrganization = tryDb<[Id, CreateOrganizationParams], Organization>(async (connection, user, organization) => {
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

export const updateOrganization = tryDb<[UpdateOrganizationParams], Organization>(async (connection, organization) => {
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

export const readOneOrganization = tryDb<[Id, boolean?], Organization | null>(async (connection, id, allowInactive = false) => {
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

export const createAffiliation = tryDb<[CreateAffiliationParams], Affiliation>(async (connection, affiliation) => {
  const now = new Date();
  if (!affiliation) {
    throw new Error('unable to create affiliation');
  }

  const [result] = await connection<RawAffiliation>('affiliations')
    .insert({
      ...affiliation,
      id: generateUuid(),
      createdAt: now,
      updatedAt: now
    } as RawAffiliation, '*');

  if (!result) {
    throw new Error('unable to create affiliation');
  }

  // TODO: send invitation email once emails notifications are in place.
  return valid(await rawAffiliationToAffiliation(connection, result));
});

export const readManyAffiliations = tryDb<[Id], AffiliationSlim[]>(async (connection, userId) => {
    const results: RawAffiliation[] = await connection<RawAffiliation>('affiliations')
      .join('organizations', 'affiliations.organization', '=', 'organizations.id')
      .select('affiliations.*')
      .where({
        'affiliations.user': userId,
        'organizations.active': true
      })
      .andWhereNot({ membershipStatus: MembershipStatus.Inactive });
    return valid(await Promise.all(results.map(async raw => await rawAffiliationToAffiliationSlim(connection, raw))));
});

export const readOneAffiliation = tryDb<[Id, Id], Affiliation | null>(async (connection, user, organization) => {
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

export const readOneAffiliationById = tryDb<[Id], Affiliation | null>(async (connection, id) => {
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
    throw new Error('unable to process affiliation'); // Will be caught by calling function
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
    throw new Error('unable to process affiliation'); // Will be caught by calling function
  }
  return {
    ...params,
    user,
    organization
  };
}

export const approveAffiliation = tryDb<[Id], Affiliation>(async (connection, id) => {
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

export const deleteAffiliation = tryDb<[Id], Affiliation>(async (connection, id) => {
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

export const readOneFileById = tryDb<[Id], FileRecord | null>(async (connection, id) => {
  const result = await connection<FileRecord>('files')
    .where({ id })
    .select(['name', 'id', 'createdAt', 'fileBlob'])
    .first();
  return valid(result ? result : null);
});

export const readOneFileBlob = tryDb<[string], FileBlob | null>(async (connection, hash) => {
  const result = await connection<FileBlob>('fileBlobs')
    .where({ hash })
    .first();
  return valid(result || null);
});

type CreateFileParams = Partial<FileRecord> & { path: string, permissions: Array<FilePermissions<Id, UserType>> };

export const createFile = tryDb<[CreateFileParams, Id], FileRecord>(async (connection, fileRecord, userId) => {
  const now = new Date();
  if (!fileRecord) {
    throw new Error('unable to create file');
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
      throw new Error('unable to create file');
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
        .where({ 'u.user': session.user.id, 'u.file': id })
        .orWhere({ 'ut.userType': session.user.type, 'ut.file': id })
        .orWhere({ 'files.createdBy': session.user.id, 'files.id': id });
    }

    const results = await query;
    return results.length > 0;
  } catch (exception) {
    return false;
  }
}

export async function hasAttachmentPermission(connection: Connection, session: Session, id: string): Promise<boolean> {
  // If file is an attachment on a publicly viewable opportunity, allow
  const results = await connection('cwuOpportunityAttachments as attachments')
    .innerJoin('cwuOpportunityVersions as versions', 'versions.id', '=', 'attachments.opportunityVersion')
    .innerJoin('cwuOpportunityStatuses as statuses', 'statuses.opportunity', '=' , 'versions.opportunity')
    .whereIn('statuses.status', publicOpportunityStatuses as CWUOpportunityStatus[])
    .andWhere({ 'attachments.file': id })
    .select('attachments.*');

  if (results.length > 0) {
    return true;
  }

  // If file is an attachment on a proposal, and requesting user has access to the proposal, allow
  if (session.user) {
    const proposals = await connection('cwuProposalAttachments as attachments')
      .innerJoin('cwuProposals as proposals', 'proposals.id', '=', 'attachments.proposal')
      .where({ 'attachments.file': id })
      .select<RawCWUProposal[]>('proposals.*');

    if (proposals.length > 0) {
      for (const proposal of proposals) {
        if (await hasReadPermissionCWUProposal(connection, session, proposal.opportunity, proposal.id)) {
          return true;
        }
      }
    }
  }
  return false;
}

interface RawCWUOpportunitySlim extends Omit<CWUOpportunitySlim, 'createdBy' | 'updatedBy'> {
  createdBy?: Id;
  updatedBy?: Id;
}

async function rawCWUOpportunitySlimToCWUOpportunitySlim(connection: Connection, raw: RawCWUOpportunitySlim): Promise<CWUOpportunitySlim> {
  const { createdBy: createdById, updatedBy: updatedById, ...restOfRaw } = raw;
  const createdBy = createdById && getValidValue(await readOneUserSlim(connection, createdById), undefined) || undefined;
  const updatedBy = updatedById && getValidValue(await readOneUserSlim(connection, updatedById), undefined) || undefined;
  return {
    ...restOfRaw,
    createdBy,
    updatedBy
  };
}

interface RawCWUOpportunity extends Omit<CWUOpportunity, 'createdBy' | 'updatedBy' | 'attachments' | 'addenda'> {
  createdBy?: Id;
  updatedBy?: Id;
  attachments: Id[];
  addenda: Id[];
  versionId: string;
}

async function rawCWUOpportunityToCWUOpportunity(connection: Connection, raw: RawCWUOpportunity): Promise<CWUOpportunity> {
  const { createdBy: createdById, updatedBy: updatedById, attachments: attachmentIds, addenda: addendaIds, ...restOfRaw } = raw;
  const createdBy = createdById ? getValidValue(await readOneUserSlim(connection, createdById), undefined) : undefined;
  const updatedBy = updatedById ? getValidValue(await readOneUserSlim(connection, updatedById), undefined) : undefined;
  const attachments = await Promise.all(attachmentIds.map(async id => {
    const result = getValidValue(await readOneFileById(connection, id), null);
    if (!result) {
      throw new Error('unable to process opportunity'); // to be caught by calling function
    }
    return result;
  }));
  const addenda = await Promise.all(addendaIds.map(async id => {
    const result = getValidValue(await readOneCWUOpportunityAddendum(connection, id), null);
    if (!result) {
      throw new Error('unable to retrieve addenda'); // to be caught by calling function
    }
    return result;
  }));

  delete raw.versionId;

  return {
    ...restOfRaw,
    createdBy: createdBy || undefined,
    updatedBy: updatedBy || undefined,
    attachments,
    addenda
  };
}

function processForRole<T extends RawCWUOpportunity | RawCWUOpportunitySlim>(result: T, session: Session) {
  // Remove createdBy/updatedBy for non-admin or non-author
  if (!session.user || (session.user.type !== UserType.Admin &&
    session.user.id !== result.createdBy &&
    session.user.id !== result.updatedBy)) {
      delete result.createdBy;
      delete result.updatedBy;
  }
  return result;
}

export const readManyCWUOpportunities = tryDb<[Session], CWUOpportunitySlim[]>(async (connection, session) => {
  // Retrieve the opportunity and most recent opportunity status

  let query = connection<RawCWUOpportunitySlim>('cwuOpportunities as opp')
    // Join on latest CWU status
    .join<RawCWUOpportunitySlim>('cwuOpportunityStatuses as stat', function() {
      this
        .on('opp.id', '=', 'stat.opportunity')
        .andOn('stat.createdAt', '=',
          connection.raw('(select max("createdAt") from "cwuOpportunityStatuses" as stat2 where \
            stat2.opportunity = opp.id)'));
    })
    // Join on latest CWU version
    .join<RawCWUOpportunitySlim>('cwuOpportunityVersions as version', function() {
      this
        .on('opp.id', '=', 'version.opportunity')
        .andOn('version.createdAt', '=',
          connection.raw('(select max("createdAt") from "cwuOpportunityVersions" as version2 where \
            version2.opportunity = opp.id)'));
    })
    // Select fields for 'slim' opportunity
    .select<RawCWUOpportunitySlim[]>(
      'opp.id',
      'version.title',
      'opp.createdBy',
      'opp.createdAt',
      'version.createdAt as updatedAt',
      'version.createdBy as updatedBy',
      'stat.status'
    );

  if (!session.user || session.user.type === UserType.Vendor) {
    // Anonymous users and vendors can only see public opportunities
    query = query
      .whereIn('stat.status', publicOpportunityStatuses as CWUOpportunityStatus[]);
  } else if (session.user.type === UserType.Government) {
    // Gov users should only see private opportunities they own, and public opportunities
    query = query
      .whereIn('stat.status', publicOpportunityStatuses as CWUOpportunityStatus[])
      .orWhere(function() {
        this
          .whereIn('stat.status', privateOpportunitiesStatuses as CWUOpportunityStatus[])
          .andWhere({ 'opp.createdBy': session.user?.id });
      });
  } else {
    // Admin users can see both private and public opportunities
    query = query
      .whereIn('stat.status', [...publicOpportunityStatuses, ...privateOpportunitiesStatuses]);
  }
  const results = (await query).map(result => processForRole(result, session));
  return valid(await Promise.all(results.map(async raw => await rawCWUOpportunitySlimToCWUOpportunitySlim(connection, raw))));
});

export const readOneCWUOpportunitySlim = tryDb<[Id, Session], CWUOpportunitySlim | null>(async (connection, oppId, session) => {
  // Since slim opportunity requires the same joins, etc. as full to build, we query the full one, and reduce down to slim
  const dbResult = await readOneCWUOpportunity(connection, oppId, session);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error('unable to read opportunity');
  }

  const fullOpportunity = dbResult.value;
  const { id, createdAt, createdBy, updatedAt, updatedBy, title, proposalDeadline, status } = fullOpportunity;
  return valid({
    id,
    createdAt,
    createdBy,
    updatedAt,
    updatedBy,
    title,
    proposalDeadline,
    status
  });
});

export const readOneCWUOpportunity = tryDb<[Id, Session], CWUOpportunity | null>(async (connection, id, session) => {
  let query = connection<RawCWUOpportunity>('cwuOpportunities as opp')
    .where({ 'opp.id': id })
    // Join on latest CWU status
    .join<RawCWUOpportunity>('cwuOpportunityStatuses as stat', function() {
      this
        .on('opp.id', '=', 'stat.opportunity')
        .andOn('stat.createdAt', '=',
          connection.raw('(select max("createdAt") from "cwuOpportunityStatuses" as stat2 where \
            stat2.opportunity = opp.id and stat2.status is not null)'));
    })
    // Join on latest CWU version
    .join<RawCWUOpportunity>('cwuOpportunityVersions as version', function() {
      this
        .on('opp.id', '=', 'version.opportunity')
        .andOn('version.createdAt', '=',
          connection.raw('(select max("createdAt") from "cwuOpportunityVersions" as version2 where \
            version2.opportunity = opp.id)'));
    })
    .select<RawCWUOpportunity>(
      'opp.id',
      'opp.createdAt',
      'opp.createdBy',
      'version.id as versionId',
      'version.createdAt as updatedAt',
      'version.createdBy as updatedBy',
      'version.title',
      'version.teaser',
      'version.remoteOk',
      'version.remoteDesc',
      'version.location',
      'version.reward',
      'version.skills',
      'version.description',
      'version.proposalDeadline',
      'version.assignmentDate',
      'version.startDate',
      'version.completionDate',
      'version.submissionInfo',
      'version.acceptanceCriteria',
      'version.evaluationCriteria',
      'stat.status'
    );

  if (!session.user || session.user.type === UserType.Vendor) {
    // Anonymous users and vendors can only see public opportunities
    query = query
      .whereIn('stat.status', publicOpportunityStatuses as CWUOpportunityStatus[]);
  } else if (session.user.type === UserType.Government) {
    // Gov users should only see private opportunities they own, and public opportunities
    query = query
      .andWhere(function() {
        this
          .whereIn('stat.status', publicOpportunityStatuses as CWUOpportunityStatus[])
          .orWhere(function() {
            this
              .whereIn('stat.status', privateOpportunitiesStatuses as CWUOpportunityStatus[])
              .andWhere({ 'opp.createdBy': session.user?.id });
          });
      });
  } else {
    // Admin users can see both private and public opportunities
    query = query
      .whereIn('stat.status', [...publicOpportunityStatuses, ...privateOpportunitiesStatuses]);
  }

  let result = await query.first();

  // Query for attachment file ids
  if (result) {
    result = processForRole(result, session);
    result.attachments = (await connection<{ file: Id }>('cwuOpportunityAttachments')
      .where({ opportunityVersion: result.versionId })
      .select('file')).map(row => row.file);
    result.addenda = (await connection<{ id: Id }>('cwuOpportunityAddenda')
      .where({ opportunity: id })
      .select('id')).map(row => row.id);
  }

  // Get published date if applicable
  if (result) {
    const publishedDate = await connection<{ createdAt: Date}>('cwuOpportunityStatuses')
      .where({ opportunity: result.id, status: CWUOpportunityStatus.Published })
      .select('createdAt')
      .orderBy('createdAt', 'asc')
      .first();

    result.publishedAt = publishedDate?.createdAt;
  }

  // Add on subscription flag, if authenticated user
  if (result && session.user) {
    const subscription = await connection<RawCWUOpportunitySubscriber>('cwuOpportunitySubscribers')
      .where({ opportunity: result.id, user: session.user.id })
      .first();
    result.subscribed = !!subscription;
  }

  // If admin/owner, add on list of change records
  if (result && session.user && (session.user.type === UserType.Admin || result.createdBy === session.user.id)) {
    const rawStatusArray = await connection<RawCWUOpportunityHistoryRecord>('cwuOpportunityStatuses')
      .where({ opportunity: result.id })
      .orderBy('createdAt', 'desc');

    result.history = await Promise.all(rawStatusArray.map(async raw => await rawCWUOpportunityHistoryRecordToCWUOpportunityHistoryRecord(connection, session, raw)));
  }

  return valid(result ? await rawCWUOpportunityToCWUOpportunity(connection, result) : null);
});

interface RawCWUOpportunityAddendum extends Omit<Addendum, 'createdBy'> {
  createdBy?: Id;
}

async function rawCWUOpportunityAddendumToCWUOpportunityAddendum(connection: Connection, raw: RawCWUOpportunityAddendum): Promise<Addendum> {
  const { createdBy: createdById, ...restOfRaw } = raw;
  const createdBy = createdById ? getValidValue(await readOneUserSlim(connection, createdById), undefined) : undefined;

  return {
    ...restOfRaw,
    createdBy: createdBy || undefined
  };
}

export const readOneCWUOpportunityAddendum = tryDb<[Id], Addendum>(async (connection, id) => {
  const result = await connection<RawCWUOpportunityAddendum>('cwuOpportunityAddenda')
    .where({ id })
    .first();

  if (!result) {
    throw new Error('unable to read addendum');
  }

  return valid(await rawCWUOpportunityAddendumToCWUOpportunityAddendum(connection, result));
});

interface CreateCWUOpportunityParams extends Omit<CWUOpportunity, 'createdBy' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'status' | 'id' | 'addenda'> {
  status: CreateCWUOpportunityStatus;
}

interface RootOpportunityRecord {
  id: Id;
  createdAt: Date;
  createdBy: Id;
}

interface OpportunityVersionRecord extends Omit<CreateCWUOpportunityParams, 'status'> {
  id: Id;
  opportunity: Id;
  createdAt: Date;
  createdBy: Id;
}

async function createCWUOpportunityAttachments(connection: Connection, trx: Transaction, oppVersionId: Id, attachments: FileRecord[]) {
  for (const attachment of attachments) {
    const [attachmentResult] = await connection('cwuOpportunityAttachments')
      .transacting(trx)
      .insert({
        opportunityVersion: oppVersionId,
        file: attachment.id
      }, '*');
    if (!attachmentResult) {
      throw new Error('Unable to create opportunity attachment');
    }
  }
}

export const createCWUOpportunity = tryDb<[CreateCWUOpportunityParams, AuthenticatedSession], CWUOpportunity>(async (connection, opportunity, session) => {
  // Create root opportunity record
  const now = new Date();
  const opportunityId = await connection.transaction(async trx => {
    const [rootOppRecord] = await connection<RootOpportunityRecord>('cwuOpportunities')
      .transacting(trx)
      .insert({
        id: generateUuid(),
        createdAt: now,
        createdBy: session.user.id
      }, '*');

    if (!rootOppRecord) {
      throw new Error('unable to create opportunity root record');
    }

    // Create initial opportunity version
    const { attachments, status, ...restOfOpportunity } = opportunity;
    const [oppVersionRecord] = await connection<OpportunityVersionRecord>('cwuOpportunityVersions')
      .transacting(trx)
      .insert({
        ...restOfOpportunity,
        id: generateUuid(),
        opportunity: rootOppRecord.id,
        createdAt: now,
        createdBy: session.user.id
      }, '*');

    if (!oppVersionRecord) {
      throw new Error('unable to create opportunity version');
    }

    // Create initial opportunity status record (Draft)
    await connection('cwuOpportunityStatuses')
      .transacting(trx)
      .insert({
        id: generateUuid(),
        opportunity: rootOppRecord.id,
        createdAt: now,
        createdBy: session.user.id,
        status,
        note: ''
      }, '*');

    // Create attachment records
    await createCWUOpportunityAttachments(connection, trx, oppVersionRecord.id, attachments);

    return rootOppRecord.id;
  });

  const dbResult = await readOneCWUOpportunity(connection, opportunityId, session);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error('unable to create opportunity');
  }
  return valid(dbResult.value);
});

export async function isCWUOpportunityAuthor(connection: Connection, user: User, id: Id): Promise<boolean> {
  try {
    const result = await connection<RawCWUOpportunity>('cwuOpportunities')
      .select('*')
      .where({ id, createdBy: user.id });
    return !!result && result.length > 0;
  } catch (exception) {
    return false;
  }
}

type UpdateCWUOpportunityParams = Partial<CWUOpportunity>;

export const updateCWUOpportunityVersion = tryDb<[UpdateCWUOpportunityParams, AuthenticatedSession], CWUOpportunity>(async (connection, opportunity, session) => {
  const now = new Date();
  const { attachments, ...restOfOpportunity } = opportunity;
  const oppVersion = await connection.transaction(async trx => {
    const [oppVersion] = await connection<OpportunityVersionRecord>('cwuOpportunityVersions')
      .transacting(trx)
      .insert({
        ...restOfOpportunity,
        opportunity: restOfOpportunity.id,
        id: generateUuid(),
        createdAt: now,
        createdBy: session.user.id
      }, '*');

    if (!oppVersion) {
      throw new Error('unable to update opportunity');
    }
    await createCWUOpportunityAttachments(connection, trx, oppVersion.id, attachments || []);

    // Add an 'edit' change record
    await connection<RawCWUOpportunityHistoryRecord & { opportunity: Id }>('cwuOpportunityStatuses')
      .insert({
        id: generateUuid(),
        opportunity: restOfOpportunity.id,
        createdAt: now,
        createdBy: session.user.id,
        event: CWUOpportunityEvent.Edited,
        note: ''
      });

    return oppVersion;
  });
  const dbResult = await readOneCWUOpportunity(connection, oppVersion.opportunity, session);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error('unable to update opportunity');
  }
  return valid(dbResult.value);
});

interface RawCWUOpportunityHistoryRecord extends Omit<CWUOpportunityHistoryRecord, 'createdBy' | 'type'> {
  createdBy: Id;
  status?: CWUOpportunityStatus;
  event?: CWUOpportunityEvent;
}

async function rawCWUOpportunityHistoryRecordToCWUOpportunityHistoryRecord(connection: Connection, session: Session, raw: RawCWUOpportunityHistoryRecord): Promise<CWUOpportunityHistoryRecord> {
  const { createdBy: createdById, status, event, ...restOfRaw } = raw;
  const createdBy = getValidValue(await readOneUserSlim(connection, createdById), undefined);

  if (!createdBy || (!status && !event)) {
    throw new Error('unable to process opportunity status record');
  }

  return {
    ...restOfRaw,
    createdBy,
    type: status ? adt('status', status as CWUOpportunityStatus) : adt('event', event as CWUOpportunityEvent)
  };
}

export const updateCWUOpportunityStatus = tryDb<[Id, CWUOpportunityStatus, string, AuthenticatedSession], CWUOpportunity>(async (connection, id, status, note, session) => {
  const now = new Date();
  const [result] = await connection<RawCWUOpportunityHistoryRecord & { opportunity: Id }>('cwuOpportunityStatuses')
    .insert({
      id: generateUuid(),
      opportunity: id,
      createdAt: now,
      createdBy: session.user.id,
      status,
      note
    }, '*');

  if (!result) {
    throw new Error('unable to update opportunity');
  }

  const dbResult = await readOneCWUOpportunity(connection, id, session);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error('unable to update opportunity');
  }

  return valid(dbResult.value);
});

interface CWUOpportunityAddendumRecord {
  id: Id;
  opportunity: Id;
  description: string;
  createdBy: string;
  createdAt: Date;
}

export const addCWUOpportunityAddendum = tryDb<[Id, string, AuthenticatedSession], CWUOpportunity>(async (connection, id, addendumText, session) => {
  const now = new Date();
  await connection.transaction(async trx => {
    const [addendum] = await connection<CWUOpportunityAddendumRecord>('cwuOpportunityAddenda')
      .transacting(trx)
      .insert({
        id: generateUuid(),
        opportunity: id,
        description: addendumText,
        createdBy: session.user.id,
        createdAt: now
      }, '*');

    if (!addendum) {
      throw new Error('unable to add addendum');
    }

    // Add a history record for the addendum addition
    await connection<RawCWUOpportunityHistoryRecord & { opportunity: Id }>('cwuOpportunityStatuses')
      .transacting(trx)
      .insert({
        id: generateUuid(),
        opportunity: id,
        createdAt: now,
        createdBy: session.user.id,
        event: CWUOpportunityEvent.AddendumAdded,
        note: ''
      });
  });

  const dbResult = await readOneCWUOpportunity(connection, id, session);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error('unable to add addendum');
  }
  return valid(dbResult.value);
});

export const deleteCWUOpportunity = tryDb<[Id], CWUOpportunity>(async (connection, id) => {
    // Delete root record - cascade relationships in database will cleanup versions/attachments/addenda automatically
    const [result] = await connection<RawCWUOpportunity>('cwuOpportunities')
      .where({ id })
      .delete('*');

    if (!result) {
      throw new Error('unable to delete opportunity');
    }
    result.addenda = [];
    result.attachments = [];
    return valid(await rawCWUOpportunityToCWUOpportunity(connection, result));
});

interface RawCWUProposalSlim extends Omit<CWUProposalSlim, 'createdBy' | 'updatedBy' | 'proponent'> {
  createdBy: Id;
  updatedBy: Id;
  proponentIndividual?: Id | null;
  proponentOrganization?: Id | null;
}

async function rawCWUProposalSlimToCWUProposalSlim(connection: Connection, raw: RawCWUProposalSlim): Promise<CWUProposalSlim> {
  const { createdBy: createdById,
          updatedBy: updatedById,
          proponentIndividual: proponentIndividualId,
          proponentOrganization: proponentOrganizationId,
          ...restOfRaw
        } = raw;

  const createdBy = getValidValue(await readOneUserSlim(connection, createdById), undefined);
  const updatedBy = getValidValue(await readOneUserSlim(connection, updatedById), undefined);
  const proponentIndividual = proponentIndividualId ? getValidValue(await readOneCWUProponent(connection, proponentIndividualId), undefined) : null;
  const proponentOrganization = proponentOrganizationId ? getValidValue(await readOneOrganization(connection, proponentOrganizationId), undefined) : null;

  if (!createdBy || !updatedBy) {
    throw new Error('unable to process proposal');
  }

  let proponent: ADT<'individual', CWUIndividualProponent> | ADT<'organization', Organization>;
  if (proponentIndividual) {
    proponent = adt('individual', proponentIndividual);
  } else if (proponentOrganization) {
    proponent = adt('organization', proponentOrganization);
  } else {
    throw new Error('unable to process proposal proponent');
  }

  return {
    ...restOfRaw,
    createdBy,
    updatedBy,
    proponent
  };
}

export const readManyCWUProposals = tryDb<[Id], CWUProposalSlim[]>(async (connection, id) => {
  const results = await connection<RawCWUProposalSlim>('cwuProposals as prop')
    .where({ opportunity: id })
    .select<RawCWUProposalSlim[]>(
      'prop.id',
      'prop.createdBy',
      'prop.createdAt',
      'updatedBy',
      'updatedAt',
      'proponentIndividual',
      'proponentOrganization',
      'score'
    );

  if (!results) {
    throw new Error('unable to read proposals');
  }

  // Read latest status for each proposal
  for (const proposal of results) {
    const statusResult = await connection<{ status: CWUProposalStatus }>('cwuProposalStatuses')
      .where({ proposal: proposal.id })
      .whereNotNull('status')
      .orderBy('createdAt', 'desc')
      .first();

    if (!statusResult) {
      throw new Error('unable to read proposal status');
    }
    proposal.status = statusResult.status;
  }

  // Read ranks for rankable proposals and apply to existing result set
  const rankableProposals = results.filter(result => isRankableCWUProposalStatus(result.status));
  const ranks = await connection
    .from('cwuProposals')
    .whereIn('id', rankableProposals.map(r => r.id))
    .andWhere({ opportunity: id })
    .select(connection.raw('id, RANK () OVER (ORDER BY score DESC) rank'));

  for (const result of results) {
    const match = ranks.find(r => r.id === result.id);
    result.rank = match ? match.rank : undefined;
  }

  return valid(await Promise.all(results.map(async result => await rawCWUProposalSlimToCWUProposalSlim(connection, result))));
});

export const readOneCWUProponent = tryDb<[Id], CWUIndividualProponent>(async (connection, id) => {
  const result = await connection<CWUIndividualProponent>('cwuProponents')
    .where({ id })
    .first();

  if (!result) {
    throw new Error('unable to read proponent');
  }

  return valid(result);
});

interface RawCWUProposal extends Omit<CWUProposal, 'createdBy' | 'updatedBy' | 'proponent' | 'opportunity' | 'attachments'> {
  createdBy: Id;
  updatedBy: Id;
  opportunity: Id;
  proponentIndividual?: Id | null;
  proponentOrganization?: Id | null;
  attachments: Id[];
}

async function rawCWUProposalToCWUProposal(connection: Connection, session: Session, raw: RawCWUProposal): Promise<CWUProposal> {
  const { opportunity: opportunityId, attachments: attachmentIds, proposalText, additionalComments, history, ...restOfProposal } = raw;
  const slimVersion = await rawCWUProposalSlimToCWUProposalSlim(connection, restOfProposal);
  const opportunity = getValidValue(await readOneCWUOpportunitySlim(connection, opportunityId, session), null);
  if (!opportunity) {
    throw new Error('unable to process proposal opportunity');
  }
  let attachments: FileRecord[];
  if (attachmentIds) {
    attachments = await Promise.all(attachmentIds.map(async id => {
      const result = getValidValue(await readOneFileById(connection, id), null);
      if (!result) {
        throw new Error('unable to process proposal attachments'); // to be caught by calling function
      }
      return result;
    }));
  } else {
    attachments = [];
  }

  return {
    ...slimVersion,
    proposalText,
    additionalComments,
    opportunity,
    attachments,
    history
  };
}

export const readOneCWUProposal = tryDb<[Id, Session], CWUProposal | null>(async (connection, id, session) => {
  const result = await connection<RawCWUProposal>('cwuProposals as prop')
    .where({ 'prop.id': id })
    .select<RawCWUProposal>(
      'prop.id',
      'prop.createdBy',
      'prop.createdAt',
      'prop.opportunity',
      'updatedBy',
      'updatedAt',
      'proposalText',
      'additionalComments',
      'proponentIndividual',
      'proponentOrganization'
    )
    .first();

  if (result) {
    // Fetch latest status for this proposal
    const statusResult = await connection<{ status: CWUProposalStatus }>('cwuProposalStatuses')
      .where({ proposal: result.id })
      .whereNotNull('status')
      .orderBy('createdAt', 'desc')
      .first();

    if (!statusResult) {
      throw new Error('unable to read proposal status');
    }
    result.status = statusResult.status;

    result.attachments = (await connection<{ file: Id }>('cwuProposalAttachments')
      .where({ proposal: result.id })
      .select('file')).map(row => row.file);

    const rawProposalStasuses = await connection<RawCWUProposalHistoryRecord>('cwuProposalStatuses')
      .where({ proposal: result.id })
      .orderBy('createdAt', 'desc');

    result.history = await Promise.all(rawProposalStasuses.map(async raw => await rawCWUProposalHistoryRecordToCWUProposalHistoryRecord(connection, session, raw)));

    // Check for permissions on viewing score and rank
    if (await readCWUProposalScore(connection, session, result.opportunity, result.id, result.status)) {
      // Add score to proposal
      result.score = (await connection<{ score: number}>('cwuProposals')
        .where({ id })
        .select('score')
        .first())?.score;

      // Add rank to proposal (if rankable)
      if (isRankableCWUProposalStatus(result.status)) {
        const ranks = await connection
          .from('cwuProposals as proposals')
          .join('cwuProposalStatuses as statuses', 'proposals.id', '=', 'statuses.proposal')
          .whereIn('statuses.status', [CWUProposalStatus.Evaluated, CWUProposalStatus.Awarded, CWUProposalStatus.NotAwarded])
          .andWhere({ opportunity: result.opportunity })
          .select<Array<{ id: Id, rank: number }>>(connection.raw('proposals.id, RANK () OVER (ORDER BY score DESC) rank'));
        result.rank = ranks.find(r => r.id === result.id)?.rank;
      }
    }
  }

  return valid(result ? await rawCWUProposalToCWUProposal(connection, session, result) : null);
});

export async function isCWUProposalAuthor(connection: Connection, user: User, id: Id): Promise<boolean> {
  try {
    const result = await connection<RawCWUProposal>('cwuProposals')
      .select('*')
      .where({ id, createdBy: user.id });
    return !!result && result.length > 0;
  } catch (exception) {
    return false;
  }
}

export const readOneProposalByOpportunityAndAuthor = tryDb<[Id, Session], CWUProposal | null>(async (connection, oppId, session) => {
  if (!session.user) {
    return valid(null);
  }
  const result = await connection<RawCWUProposal>('cwuProposals')
    .where({ opportunity: oppId, createdBy: session.user.id })
    .first();

  return valid(result ? await rawCWUProposalToCWUProposal(connection, session, result) : null);
});

export interface CreateCWUProposalParams {
  opportunity: Id;
  proposalText: string;
  additionalComments: string;
  proponent: ADT<'individual', CreateIndividualProponentRequestBody> | ADT<'organization', Id>;
  attachments: FileRecord[];
  status: CreateCWUProposalStatus;
}

async function createCWUProposalAttachments(connection: Connection, trx: Transaction, proposalId: Id, attachments: FileRecord[]) {
  for (const attachment of attachments) {
    // Check to see for existing attachment relation.
    const existing = await connection('cwuProposalAttachments')
      .where({
        proposal: proposalId,
        file: attachment.id
      })
      .select('*')
      .first();
    // If it doesn't exist, create relation.
    if (!existing) {
      const [attachmentResult] = await connection('cwuProposalAttachments')
        .transacting(trx)
        .insert({
          proposal: proposalId,
          file: attachment.id
        }, '*');
      if (!attachmentResult) {
        throw new Error('Unable to create proposal attachment');
      }
    }
  }
}

export const createCWUProposal = tryDb<[CreateCWUProposalParams, AuthenticatedSession], CWUProposal>(async (connection, proposal, session) => {
  const now = new Date();
  return valid(await connection.transaction(async trx => {
    // If proponent is individual, create that record first
    const { attachments, proponent, status, ...restOfProposal } = proposal;
    let createProposalParamsWithProponent: Pick<RawCWUProposal, 'opportunity' | 'proponentIndividual' | 'proponentOrganization'>;
    if (proponent.tag === 'individual') {
      const [proponentId] = await connection('cwuProponents')
        .transacting(trx)
        .insert({
          ...proponent.value,
          id: generateUuid(),
          createdAt: now,
          createdBy: session.user.id,
          updatedAt: now,
          updatedBy: session.user.id
        }, 'id');
      createProposalParamsWithProponent = {
        ...restOfProposal,
        proponentIndividual: proponentId
      };
    } else {
      createProposalParamsWithProponent = {
        ...restOfProposal,
        proponentOrganization: proponent.value
      };
    }

    // Create root record for proposal
    const [rootRecord] = await connection<RawCWUProposal>('cwuProposals')
      .transacting(trx)
      .insert({
        ...createProposalParamsWithProponent,
        id: generateUuid(),
        createdAt: now,
        createdBy: session.user.id,
        updatedAt: now,
        updatedBy: session.user.id
      }, '*');

    if (!rootRecord) {
      throw new Error('unable to create proposal');
    }

    // Create a proposal status record
    await connection('cwuProposalStatuses')
      .transacting(trx)
      .insert({
        id: generateUuid(),
        proposal: rootRecord.id,
        status,
        createdAt: now,
        createdBy: session.user.id,
        note: ''
      }, '*');

    // Create attachment records
    await createCWUProposalAttachments(connection, trx, rootRecord.id, attachments);

    const dbResult = await readOneCWUProposal(trx, rootRecord.id, session);
    if (isInvalid(dbResult) || !dbResult.value) {
      throw new Error('unable to create proposal');
    }
    return dbResult.value;
  }));
});

interface UpdateCWUProposalParams extends Partial<Omit<CWUProposal, 'createdBy' | 'updatedBy' | 'opportunity' | 'proponent'>> {
  createdBy?: Id;
  updatedBy?: Id;
  proponent: UpdateProponentRequestBody;
}

export const updateCWUProposal = tryDb<[UpdateCWUProposalParams, AuthenticatedSession], CWUProposal>(async (connection, proposal, session) => {
  const now = new Date();
  const { attachments, proponent, ...restOfProposal } = proposal;
  let proponentIndividualId: Id | null = null;
  return valid(await connection.transaction(async trx => {
    const proposalResult = await connection('cwuProposals')
      .where({ id: proposal.id })
      .select<RawCWUProposal>('proponentIndividual')
      .first();
    if (!proposalResult) { throw new Error('unable to update proposal'); }
    // Update/create individual proponent first to satisfy constraints.
    if (proponent.tag === 'individual') {
      if (proposalResult.proponentIndividual) {
        // Update existing proponent individual.
        await connection('cwuProponents')
          .transacting(trx)
          .where({
            id: proposalResult.proponentIndividual
          })
          .update({
            ...proponent.value,
            updatedAt: now,
            updatedBy: session.user.id
          });
        proponentIndividualId = proposalResult.proponentIndividual;
      } else {
        // No existing individual proponent, so create one instead.
        const [result] = await connection('cwuProponents')
          .transacting(trx)
          .insert({
            ...proponent.value,
            id: generateUuid(),
            createdAt: now,
            createdBy: session.user.id,
            updatedAt: now,
            updatedBy: session.user.id
          }, '*');
        proponentIndividualId = result.id;
      }
    }
    // Update proposal
    const [result] = await connection<RawCWUProposal>('cwuProposals')
      .transacting(trx)
      .where({ id: proposal.id })
      .update({
        ...restOfProposal,
        updatedAt: now,
        updatedBy: session.user.id,
        // Update proponent
        proponentIndividual: proponentIndividualId,
        proponentOrganization: proponent.tag === 'organization' ? proponent.value : null
      }, '*');

    if (!result) {
      throw new Error('unable to update proposal');
    }

    await createCWUProposalAttachments(connection, trx, result.id, attachments || []);

    const dbResult = await readOneCWUProposal(trx, result.id, session);
    if (isInvalid(dbResult) || !dbResult.value) {
      throw new Error('unable to update proposal');
    }
    return dbResult.value;
  }));
});

interface RawCWUProposalHistoryRecord extends Omit<CWUProposalHistoryRecord, 'createdBy' | 'type'> {
  createdBy: Id;
  status?: CWUProposalStatus;
  event?: CWUProposalEvent;
}

async function rawCWUProposalHistoryRecordToCWUProposalHistoryRecord(connection: Connection, session: Session, raw: RawCWUProposalHistoryRecord): Promise<CWUProposalHistoryRecord> {
  const { createdBy: createdById, status, event, ...restOfRaw } = raw;
  const createdBy = getValidValue(await readOneUserSlim(connection, createdById), undefined);

  if (!createdBy || (!status && !event)) {
    throw new Error('unable to process proposal status record');
  }

  return {
    ...restOfRaw,
    createdBy,
    type: status ? adt('status', status as CWUProposalStatus) : adt('event', event as CWUProposalEvent)
  };
}

export const updateCWUProposalStatus = tryDb<[Id, CWUProposalStatus, string, AuthenticatedSession], CWUProposal>(async (connection, proposalId, status, note, session) => {
  const now = new Date();
  return valid(await connection.transaction(async trx => {
    const [result] = await connection<RawCWUProposalHistoryRecord & { proposal: Id }>('cwuProposalStatuses')
      .transacting(trx)
      .insert({
        id: generateUuid(),
        proposal: proposalId,
        createdAt: now,
        createdBy: session.user.id,
        status,
        note
      }, '*');

    // Update updatedAt/By stamp on proposal root record
    await connection('cwuProposals')
      .transacting(trx)
      .where({ id: proposalId })
      .update({
        updatedAt: now,
        updatedBy: session.user.id
      });

    if (!result) {
      throw new Error('unable to update proposal');
    }

    const dbResult = await readOneCWUProposal(trx, result.proposal, session);
    if (isInvalid(dbResult) || !dbResult.value) {
      throw new Error('unable to update proposal');
    }

    return dbResult.value;
  }));
});

export const updateCWUProposalScore = tryDb<[Id, number, AuthenticatedSession], CWUProposal>(async (connection, proposalId, score, session) => {
  const now = new Date();
  return valid(await connection.transaction(async trx => {

    // Get latest status for this proposal
    const statusResult = await connection<RawCWUProposalHistoryRecord>('cwuProposalStatuses')
      .whereNotNull('status')
      .andWhere({ proposal: proposalId })
      .orderBy('createdAt', 'desc')
      .select('status')
      .first();

    if (statusResult?.status === CWUProposalStatus.UnderReview) {
      // Add new EVALUATED status for proposal
      await connection<RawCWUProposalHistoryRecord & { proposal: Id }>('cwuProposalStatuses')
        .transacting(trx)
        .insert({
          id: generateUuid(),
          proposal: proposalId,
          createdAt: now,
          createdBy: session.user.id,
          status: CWUProposalStatus.Evaluated,
          note: ''
        }, '*');
    }

    // Update updatedAt/By stamp and score on proposal root record
    await connection('cwuProposals')
      .transacting(trx)
      .where({ id: proposalId })
      .update({
        score,
        updatedAt: now,
        updatedBy: session.user.id
      });

    // Create a history record for the score entry
    const [result] = await connection<RawCWUProposalHistoryRecord & { proposal: Id }>('cwuProposalStatuses')
      .transacting(trx)
      .insert({
        id: generateUuid(),
        proposal: proposalId,
        createdAt: now,
        createdBy: session.user.id,
        event: CWUProposalEvent.ScoreEntered,
        note: `A score of "${score}%" was entered.`
      }, '*');

    if (!result) {
      throw new Error('unable to update proposal');
    }

    const dbResult = await readOneCWUProposal(trx, result.proposal, session);
    if (isInvalid(dbResult) || !dbResult.value) {
      throw new Error('unable to update proposal');
    }

    return dbResult.value;
  }));
});

export const awardCWUProposal = tryDb<[Id, string, AuthenticatedSession], CWUProposal>(async (connection, proposalId, note, session) => {
  const now = new Date();
  return valid(await connection.transaction(async trx => {
    // Update status for awarded proposal first
    await connection<RawCWUProposalHistoryRecord & { proposal: Id }>('cwuProposalStatuses')
      .transacting(trx)
      .insert({
        id: generateUuid(),
        proposal: proposalId,
        createdAt: now,
        createdBy: session.user.id,
        status: CWUProposalStatus.Awarded,
        note
      }, '*');

    // Update proposal root record
    const [proposalRecord] = await connection<RawCWUProposal>('cwuProposals')
      .where({ id: proposalId })
      .update({
        updatedAt: now,
        updatedBy: session.user.id
      }, '*');

    // Update all other proposals on opportunity to Not Awarded
    await connection('cwuProposalStatuses')
      .transacting(trx)
      .whereIn('proposal', async function() {
        this
          .select('id')
          .from('cwuProposals')
          .where({ opportunity: proposalRecord.opportunity });
      })
      .andWhereNot({ proposal: proposalId })
      .update({
        status: CWUProposalStatus.NotAwarded
      });

    // Update opportunity
    await updateCWUOpportunityStatus(trx, proposalRecord.opportunity, CWUOpportunityStatus.Awarded, '', session);

    const dbResult = await readOneCWUProposal(trx, proposalRecord.id, session);
    if (isInvalid(dbResult) || !dbResult.value) {
      throw new Error('unable to update proposal');
    }

    return dbResult.value;
  }));
});

export const deleteCWUProposal = tryDb<[Id, Session], CWUProposal>(async (connection, id, session) => {
  // Delete root record
  const [result] = await connection<RawCWUProposal>('cwuProposals')
    .where({ id })
    .delete('*');

  if (!result) {
    throw new Error('unable to delete opportunity');
  }
  result.attachments = [];
  return valid(await rawCWUProposalToCWUProposal(connection, session, result));
});

interface RawCWUOpportunitySubscriber {
  opportunity: Id;
  user: Id;
  createdAt: Date;
}

async function rawCWUOpportunitySubscriberToCWUOpportunitySubscriber(connection: Connection, session: Session, raw: RawCWUOpportunitySubscriber): Promise<CWUOpportunitySubscriber> {
  const { opportunity: opportunityId, user: userId, ...restOfRaw } = raw;
  const opportunity = getValidValue(await readOneCWUOpportunitySlim(connection, opportunityId, session), null);
  const user = getValidValue(await readOneUserSlim(connection, userId), null);
  if (!opportunity || !user) {
    throw new Error('unable to process subscription');
  }
  return {
    ...restOfRaw,
    opportunity,
    user
  };
}

export const readOneCWUSubscriberByOpportunityAndUser = tryDb<[Id, Id, Session], CWUOpportunitySubscriber | null>(async (connection, opportunityId, userId, session) => {
  const result = await connection<RawCWUOpportunitySubscriber>('cwuOpportunitySubscribers')
    .where({ opportunity: opportunityId, user: userId})
    .first();

  return valid(result ? await rawCWUOpportunitySubscriberToCWUOpportunitySubscriber(connection, session, result) : null);
});

interface CreateCWUOpportunitySubscriberParams {
  opportunity: Id;
  user: Id;
}

export const createCWUOpportunitySubscriber = tryDb<[CreateCWUOpportunitySubscriberParams, Session], CWUOpportunitySubscriber>(async (connection, subscriber, session) => {
  const now = new Date();
  const [result] = await connection<RawCWUOpportunitySubscriber>('cwuOpportunitySubscribers')
    .insert({
      ...subscriber,
      createdAt: now
    }, '*');

  if (!result) {
    throw new Error('unable to create subscription');
  }

  return valid(await rawCWUOpportunitySubscriberToCWUOpportunitySubscriber(connection, session, result));
});

type DeleteCWUOpportunitySubscriberParams = CreateCWUOpportunitySubscriberParams;

export const deleteCWUOpportunitySubscriber = tryDb<[DeleteCWUOpportunitySubscriberParams, Session], CWUOpportunitySubscriber>(async (connection, subscriber, session) => {
  const [result] = await connection<RawCWUOpportunitySubscriber>('cwuOpportunitySubscribers')
    .where({ opportunity: subscriber.opportunity, user: subscriber.user })
    .delete('*');

  if (!result) {
    throw new Error('unable to delete subscription');
  }

  return valid(await rawCWUOpportunitySubscriberToCWUOpportunitySubscriber(connection, session, result));
});

export const readManyCWUSubscribedUsers = tryDb<[Id], User[]>(async (connection, opportunity) => {
  const results = await connection<RawUser>('users')
    .join('cwuOpportunitySubscribers as subscribers', 'users.id', '=', 'subscribers.user')
    .where({ opportunity })
    .select('users.*');

  return valid(await Promise.all(results.map(async raw => await rawUserToUser(connection, raw))));
});
