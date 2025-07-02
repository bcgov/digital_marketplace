import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import { Knex } from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

const SERVICE_AREA_ENUM = "SERVICE_DESIGNER";
const SERVICE_AREA_NAME = "Service Designer";

export async function up(connection: Knex): Promise<void> {
  await connection("serviceAreas").insert({
    serviceArea: SERVICE_AREA_ENUM,
    name: SERVICE_AREA_NAME
  });
  logger.info(`Added "${SERVICE_AREA_NAME}" to serviceAreas table.`);
}

export async function down(connection: Knex): Promise<void> {
  await connection("serviceAreas")
    .where({ serviceArea: SERVICE_AREA_ENUM })
    .delete();
  logger.info(`Removed "${SERVICE_AREA_NAME}" from serviceAreas table.`);
}
