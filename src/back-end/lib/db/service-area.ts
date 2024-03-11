import { tryDb } from "back-end/lib/db";
import { valid } from "shared/lib/http";
import {
  ServiceAreaId,
  TWUServiceAreaRecord
} from "shared/lib/resources/service-area";
import { Id } from "shared/lib/types";
import { TWUServiceArea } from "shared/lib/resources/opportunity/team-with-us";

/**
 * Reads a service area from the database, returns a number (id) if given a string value (enum)
 *
 * @param connection
 * @param serviceArea - the enum value
 * @returns ServiceAreaId - the id value of the service area in the database
 */
export const readOneServiceAreaByServiceArea = tryDb<
  [Id],
  ServiceAreaId | null
>(async (connection, serviceArea) => {
  const result = await connection<TWUServiceAreaRecord>("serviceAreas")
    .where("serviceArea", serviceArea)
    .first();
  return valid(result ? result.id : null);
});

/**
 * Reads a service area from the database, returns a service area (enum) if given a number (id) value
 *
 * @param connection
 * @param id - serviceAreaId
 * @returns TWUServiceArea - the enum value
 */
export const readOneServiceAreaByServiceAreaId = tryDb<
  [ServiceAreaId],
  TWUServiceArea | null
>(async (connection, id) => {
  const result = await connection<TWUServiceAreaRecord>("serviceAreas")
    .where({ id })
    .first();
  return valid(result ? result.serviceArea : null);
});
