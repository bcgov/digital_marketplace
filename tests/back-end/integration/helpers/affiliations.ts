import {
  Connection,
  CreateAffiliationParams,
  createAffiliation
} from "back-end/lib/db";
import { Affiliation } from "shared/lib/resources/affiliation";
import { getValidValue } from "shared/lib/validation";

export async function insertAffiliation(
  connection: Connection,
  params: CreateAffiliationParams
): Promise<Affiliation> {
  const affiliation = getValidValue(
    await createAffiliation(connection, params),
    null
  );
  if (!affiliation) throw Error("Unable to create test data");
  return affiliation;
}
