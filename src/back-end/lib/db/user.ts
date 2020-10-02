import { generateUuid } from 'back-end/lib';
import { Connection, tryDb } from 'back-end/lib/db';
import { readOneFileById } from 'back-end/lib/db/file';
import { valid } from 'shared/lib/http';
import { User, UserSlim, UserStatus, UserType } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';
import { getValidValue } from 'shared/lib/validation';

type CreateUserParams = Omit<Partial<User>, 'avatarImageFile'> & { createdAt?: Date, updatedAt?: Date, avatarImageFile?: Id };

type UpdateUserParams = Omit<Partial<User>, 'avatarImageFile'> & { updatedAt?: Date, avatarImageFile?: Id };

export interface RawUser extends Omit<User, 'avatarImageFile'> {
  avatarImageFile: Id | null;
}

export interface RawUserSlim extends Omit<UserSlim, 'avatarImageFile'> {
  avatarImageFile?: Id;
}

export async function rawUserToUser(connection: Connection, params: RawUser): Promise<User> {
  const { avatarImageFile: fileId, ...restOfRawUser } = params;
  const avatarImageFile = fileId ? getValidValue(await readOneFileById(connection, fileId), null) : null;
  return {
    ...restOfRawUser,
    avatarImageFile
  };
}

export async function rawUserSlimToUserSlim(connection: Connection, params: RawUserSlim): Promise<UserSlim> {
  const { avatarImageFile: fileId, ...restOfRawUser } = params;
  const avatarImageFile = fileId ? getValidValue(await readOneFileById(connection, fileId), null) : null;
  return {
    ...restOfRawUser,
    avatarImageFile: avatarImageFile || undefined
  };
}

export const readOneUser = tryDb<[Id], User | null>(async (connection, id) => {
  const result = await connection<RawUser>('users')
    .where({ id })
    .first();
  return valid(result ? await rawUserToUser(connection, result) : null);
});

export const readOneUserSlim = tryDb<[Id], UserSlim | null>(async (connection, id) => {
  const result = await connection<UserSlim>('users')
    .where({ id })
    .select('id', 'name', 'avatarImageFile')
    .first();
  return valid(result ? result : null);
});

export const readOneUserByEmail = tryDb<[string, boolean?, UserType?], User | null>(async (connection, email, allowInactive = false, userType) => {
  const where = {
    email,
    status: (allowInactive ? '*' : UserStatus.Active),
    type: userType || '*'
  };
  const result: RawUser = await connection('users')
    .where(where)
    .first();
  return valid(result ? await rawUserToUser(connection, result) : null);
});

export const findOneUserByTypeAndUsername = tryDb<[UserType, string], User | null>(async (connection, userType, idpUsername) => {
  const query = connection<User>('users')
    .where({ type: userType, idpUsername })
    // Support querying admin statuses even if the desired user could be a vendor.
    // This is useful for development purposes.
    .orWhere({ type: UserType.Admin, idpUsername });
  const result = await query.first();
  return valid(result ? result : null);
});

export const findOneUserByTypeAndIdp = tryDb<[UserType, string], User | null>(async (connection, type, idpId) => {
  const result = await connection<User>('users')
    .where({ idpId, type }).first()
    .orWhere({ type: UserType.Admin, idpId });
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

export const readManyUsersByRole = tryDb<[UserType], User[]>(async (connection, type) => {
  const results = await connection<RawUser>('users')
    .where({ type })
    .select('*');
  return valid(await Promise.all(results.map(async raw => await rawUserToUser(connection, raw))));
});

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

export async function userHasAcceptedTerms(connection: Connection, id: Id): Promise<boolean> {
  const [result] = await connection<{ acceptedTerms: Date }>('users')
    .where({ id })
    .select('acceptedTerms');

  if (!result) {
    throw new Error('unable to check terms status for user');
  }
  if (result.acceptedTerms) {
    return true;
  }
  return false;
}
