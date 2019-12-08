import { generateUuid } from 'back-end/lib';
import { ValidatedCreateRequestBody as ValidatedOrgCreateRequestBody } from 'back-end/lib/resources/organization';
import { ValidatedUpdateRequestBody as ValidatedUserUpdateRequestBody } from 'back-end/lib/resources/user';
import Knex from 'knex';
import { Affiliation, CreateRequestBody as CreateAffilicationRequestBody, MembershipType } from 'shared/lib/resources/affiliation';
import { PublicFile } from 'shared/lib/resources/file';
import { Organization, OrganizationSlim } from 'shared/lib/resources/organization';
import { Session } from 'shared/lib/resources/session';
import { User, UserType } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';

export type Connection = Knex<any, any>;

export async function createUser(connection: Connection, user: Omit<User, 'id'>): Promise<User> {
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
  return result;
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
  return result;
}

export async function readOneUser(connection: Connection, id: Id): Promise<User | null> {
  const result = await connection('users')
    .where({ id })
    .first();
  return result ? result : null;
}

export async function readManyUsers(connection: Connection): Promise<User[]> {
  return (await connection('users').select()).map(raw => ({
    id: raw.id,
    type: raw.type,
    status: raw.status,
    name: raw.name,
    email: raw.email,
    notificationsOn: raw.notificationsOn,
    acceptedTerms: raw.acceptedTerms,
    idpUsername: raw.idpUsername,
    avatarImageUrl: raw.avatarImageUrl
  }));
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

export async function readOneFile(connection: Connection, id: Id): Promise<PublicFile> {
  const result = await connection('files')
    .where({ id })
    .first();

  return result ? result : null;
}

export async function readManyOrganizationsAsAdmin(connection: Connection): Promise<OrganizationSlim[]> {
  // Join on organizations, affiliations, users to get owner name
  const results = (await connection('organizations')
    .select('organizations.id as org_id', 'legalName', 'files.id as logoImageFileId', 'users.id as ownerId', 'users.name as ownerName')
    .join('affiliations', 'organizations.id', '=', 'affiliations.organization')
    .join('users', 'affiliations.user', '=', 'users.id')
    .leftOuterJoin('files', 'organizations.file', '=', 'files.id')
    .where({ 'affiliations.membershipType': MembershipType.Owner }));

  return Promise.all(results.map(async raw => await rawOrganizationToOrganizationSlim(connection, raw)));
}

export async function readManyOrganizationsAsPublic(connection: Connection): Promise<OrganizationSlim[]> {
  const results = (await connection('organizations')
    .select('organizations.id', 'legalName', 'files.id as logoImageFileId')
    .leftOuterJoin('files', 'organizations.file', '=', 'files.id'));

  return Promise.all(results.map(async raw => await rawOrganizationToOrganizationSlim(connection, raw)));
}

export async function rawOrganizationToOrganizationSlim(connection: Connection, params: RawOrganizationSlimToOrganizationSlimParams): Promise<OrganizationSlim> {
  const organization: OrganizationSlim = {
    id: params.org_id,
    legalName: params.legalName
  };
  if (params.logoImageFileId) {
    organization.logoImageFile = await readOneFile(connection, params.logoImageFileId);
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
    const logoImageFile = await readOneFile(connection, fileId);
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

export async function createOrganization(connection: Connection, organization: ValidatedOrgCreateRequestBody): Promise<Organization> {
  const now = new Date();
  const [result] = await connection('organizations')
    .insert({
      ...organization,
      id: generateUuid(),
      createdAt: now,
      updatedAt: now
    }, ['*']);
  if (!result) {
    throw new Error('unable to create organization');
  }
  return result;
}

export async function readOneOrganization(connection: Connection, id: Id): Promise<Organization> {
  const result = await connection('organizations')
    .where({ id })
    .first();

  return await rawOrganizationToOrganization(connection, result);
}

// TODO - update this to take a validated request body once the affiliation resource is created
export async function createAffiliation(connection: Connection, affiliation: CreateAffilicationRequestBody): Promise<Affiliation> {
  const now = new Date();
  const [result] = await connection('affiliations')
    .insert({
      ...affiliation,
      createdAt: now,
      updatedAt: now
    }, ['*']);

  if (!result) {
    throw new Error('unable to create affiliation');
  }

  return result;
}

// export async function readManyAffiliations(connection: Connection, userId: Id): Promise<Affiliation[]> {

// }

export async function isUserOwnerOfOrg(connection: Connection, userId: Id, orgId: Id): Promise<boolean> {
  const [result] = await connection('affiliations')
    .where ({ user: userId, org: orgId })
    .first();

  return !!result;
}
