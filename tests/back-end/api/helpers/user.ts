import { PG_CONFIG } from "back-end/config";
import { connectToDatabase } from "back-end/index";
import { Connection, createUser, CreateUserParams } from "back-end/lib/db";
import { Session } from "shared/lib/resources/session";
import { User } from "shared/lib/resources/user";
import { getValidValue } from "shared/lib/validation";
import { Request } from "superagent";
import { getSignedSessionId, insertSession } from "./session";

export async function insertUser(
  params: CreateUserParams,
  connection?: Connection
): Promise<User> {
  if (!connection) connection = await connectToDatabase(PG_CONFIG);
  const user = getValidValue(await createUser(connection, params), null);
  if (!user) throw Error("Unable to create test data");
  return user;
}

export async function insertUserWithActiveSession(
  params: CreateUserParams,
  connection?: Connection
): Promise<[User, Session]> {
  if (!connection) connection = await connectToDatabase(PG_CONFIG);
  const user = await insertUser(params, connection);
  const session = await insertSession(user, connection);

  return [user, session];
}

export function getRequestWithCookie(
  request: Request,
  session: Session
): Request {
  const signedSessionId = getSignedSessionId(session);
  return request.set("Cookie", [`sid=${signedSessionId}`]);
}
