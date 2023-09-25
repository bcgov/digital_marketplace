import {
  Connection,
  CreateSWUOpportunityParams,
  createSWUOpportunity
} from "back-end/lib/db";
import {
  SWUOpportunity,
  SWUOpportunityStatus
} from "shared/lib/resources/opportunity/sprint-with-us";
import { Session } from "shared/lib/resources/session";
import { getValidValue } from "shared/lib/validation";
import * as permissions from "back-end/lib/permissions";

export async function insertSWUOpportunity(
  connection: Connection,
  params: CreateSWUOpportunityParams,
  session: Session
): Promise<SWUOpportunity> {
  if (
    !permissions.createSWUOpportunity(
      session,
      SWUOpportunityStatus.Published
    ) ||
    !permissions.isSignedIn(session)
  )
    throw Error("Session does not have permission");

  const opportunity = getValidValue(
    await createSWUOpportunity(connection, params, session),
    null
  );
  if (!opportunity) throw Error("Unable to create test data");
  return opportunity;
}
