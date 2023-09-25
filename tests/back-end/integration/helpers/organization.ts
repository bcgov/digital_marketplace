import { Connection } from "back-end/lib/db";
import {
  CreateOrganizationParams,
  createOrganization
} from "back-end/lib/db/organization";
import { Organization } from "shared/lib/resources/organization";
import { Session } from "shared/lib/resources/session";
import { Id } from "shared/lib/types";
import { getValidValue } from "shared/lib/validation";

export async function insertOrganization(
  connection: Connection,
  user: Id,
  params: CreateOrganizationParams,
  session: Session
): Promise<Organization> {
  const organization = getValidValue(
    await createOrganization(connection, user, params, session),
    null
  );
  if (!organization) throw Error("Unable to create test data");
  return organization;
}
