import {
  Connection,
  CreateCWUOpportunityParams,
  createCWUOpportunity
} from "back-end/lib/db";
import { CWUOpportunity } from "shared/lib/resources/opportunity/code-with-us";
import { Session } from "shared/lib/resources/session";
import { getValidValue } from "shared/lib/validation";
import * as permissions from "back-end/lib/permissions";

export async function insertCWUOpportunity(
  connection: Connection,
  params: CreateCWUOpportunityParams,
  session: Session
): Promise<CWUOpportunity> {
  if (
    !permissions.createCWUOpportunity(session) ||
    !permissions.isSignedIn(session)
  )
    throw Error("Session does not have permission");

  const opportunity = getValidValue(
    await createCWUOpportunity(connection, params, session),
    null
  );
  if (!opportunity) throw Error("Unable to create test data");
  return opportunity;
}
