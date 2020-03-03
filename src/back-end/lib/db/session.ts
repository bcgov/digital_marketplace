import { generateUuid } from 'back-end/lib';
import { Connection, tryDb } from 'back-end/lib/db';
import { readOneUser } from 'back-end/lib/db/user';
import { valid } from 'shared/lib/http';
import { Session } from 'shared/lib/resources/session';
import { Id } from 'shared/lib/types';
import { isValid } from 'shared/lib/validation';

interface RawSession {
  id: Id;
  accessToken?: string;
  user?: Id;
}

type UpdateSessionParams = Omit<Session, 'user'> & { user: Id, updatedAt?: Date };

async function rawSessionToSession(connection: Connection, params: RawSession): Promise<Session> {
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

export const readOneSession = tryDb<[Id], Session>(async (connection, id) => {
  const result = await connection<RawSession>('sessions')
    .where({ id })
    .first();

  if (!result) { return await createAnonymousSession(connection); }
  return valid(await rawSessionToSession(connection, {
    id: result.id,
    accessToken: result.accessToken,
    user: result.user
  }));
});

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
