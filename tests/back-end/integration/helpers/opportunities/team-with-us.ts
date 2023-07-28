import {
  Connection,
  CreateTWUOpportunityParams,
  createTWUOpportunity
} from "back-end/lib/db";
import {
  TWUOpportunity,
  TWUOpportunityStatus
} from "shared/lib/resources/opportunity/team-with-us";
import { Session } from "shared/lib/resources/session";
import { getValidValue } from "shared/lib/validation";
import * as permissions from "back-end/lib/permissions";

export async function insertTWUOpportunity(
  connection: Connection,
  params: CreateTWUOpportunityParams,
  session: Session
): Promise<TWUOpportunity> {
  if (
    !permissions.createTWUOpportunity(
      session,
      TWUOpportunityStatus.Published
    ) ||
    !permissions.isSignedIn(session)
  )
    throw Error("Session does not have permission");

  const opportunity = getValidValue(
    await createTWUOpportunity(connection, params, session),
    null
  );
  if (!opportunity) throw Error("Unable to create test data");
  return opportunity;
}
