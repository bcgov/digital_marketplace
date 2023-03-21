import { tryDb } from "back-end/lib/db";
import { valid } from "shared/lib/http";
import { TWUServiceAreaRecord } from "shared/lib/resources/serviceArea";
import { Id } from "shared/lib/types";

export const readOneServiceAreaByServiceArea = tryDb<[Id], number | null>(
  async (connection, serviceArea) => {
    const result = await connection<TWUServiceAreaRecord>("serviceAreas")
      .where({ serviceArea })
      .first();
    return valid(result ? result.id : null);
  }
);
