import { tryDb } from "back-end/lib/db";
import { valid } from "shared/lib/http";
import {
  ServiceAreaId,
  TWUServiceAreaRecord
} from "shared/lib/resources/service-area";
import { Id } from "shared/lib/types";

export const readOneServiceAreaByServiceArea = tryDb<
  [Id],
  ServiceAreaId | null
>(async (connection, serviceArea) => {
  const result = await connection<TWUServiceAreaRecord>("serviceAreas")
    .where("serviceArea", serviceArea)
    .first();
  return valid(result ? result.id : null);
});
