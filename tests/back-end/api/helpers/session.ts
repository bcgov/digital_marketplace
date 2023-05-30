import { COOKIE_SECRET, PG_CONFIG } from "back-end/config";
import { connectToDatabase } from "back-end/index";
import { Connection, createSession } from "back-end/lib/db";
import { Session } from "shared/lib/resources/session";
import { User } from "shared/lib/resources/user";
import { getValidValue } from "shared/lib/validation";
import cookieSigner from "cookie-signature";

export async function insertSession(
  user: User,
  connection?: Connection
): Promise<Session> {
  if (!connection) connection = await connectToDatabase(PG_CONFIG);
  const session = getValidValue(
    await createSession(connection, {
      user: user.id,
      accessToken: "test"
    }),
    null
  );
  if (!session) throw new Error("Unable to create test data");
  return session;
}

export function getSignedSessionId(session: Session): string {
  if (!session) return "";
  return `s:${cookieSigner.sign(session.id, COOKIE_SECRET)}`;
}
