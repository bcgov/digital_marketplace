import { generateUuid } from "back-end/lib";
import { Connection, tryDb } from "back-end/lib/db";
import { readOneUser } from "back-end/lib/db/user";
import { valid } from "shared/lib/http";
import { Session } from "shared/lib/resources/session";
import { Id } from "shared/lib/types";
import { getValidValue } from "shared/lib/validation";

interface RawSession {
  id: Id;
  createdAt: Date;
  updatedAt: Date;
  accessToken: string;
  user: Id;
}

interface CreateSessionParams {
  accessToken: string;
  user: Id;
}

async function rawSessionToSession(
  connection: Connection,
  raw: RawSession
): Promise<Session> {
  const { user: userId, ...restOfRaw } = raw;
  const user = getValidValue(await readOneUser(connection, userId), null);
  if (!user) {
    throw new Error("unable to read session");
  }
  return {
    ...restOfRaw,
    user
  };
}

export const readOneSession = tryDb<[Id], Session | null>(
  async (connection, id) => {
    const result = await connection<RawSession>("sessions")
      .where({ id })
      .first();

    return valid(result ? await rawSessionToSession(connection, result) : null);
  }
);

export const createSession = tryDb<[CreateSessionParams], Session>(
  async (connection, session) => {
    const now = new Date();
    const [result] = await connection<RawSession>("sessions").insert(
      {
        ...session,
        id: generateUuid(),
        createdAt: now,
        updatedAt: now
      },
      "*"
    );

    if (!result) {
      throw new Error("unable to create session");
    }
    return valid(await rawSessionToSession(connection, result));
  }
);

export const deleteSession = tryDb<[Id], null>(async (connection, id) => {
  await connection("sessions").where({ id }).delete();
  return valid(null);
});
