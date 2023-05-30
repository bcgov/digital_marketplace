import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

export async function up(connection: Knex): Promise<void> {
  await connection.schema.raw(`
              UPDATE "serviceAreas"
              SET "serviceArea" = 'FULL_STACK_DEVELOPER',
                  name = 'Full Stack Developer'
              where "id" = 1;
              UPDATE "serviceAreas"
              SET "serviceArea" = 'DATA_PROFESSIONAL',
                  name = 'Data Professional'
              where "id" = 2;
              UPDATE "serviceAreas"
              SET "serviceArea" = 'AGILE_COACH',
                  name = 'Agile Coach'
              where "id" = 3;
    `);
  logger.info("Updated serviceArea table with new content");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.raw(`
              UPDATE "serviceAreas"
              SET "serviceArea" = 'DEVELOPER',
                  name = 'Developer'
              where "id" = 1;
              UPDATE "serviceAreas"
              SET "serviceArea" = 'DATA_SPECIALIST',
                  name = 'Data Specialist'
              where "id" = 2;
              UPDATE "serviceAreas"
              SET "serviceArea" = 'SCRUM_MASTER',
                  name = 'Scrum Master'
              where "id" = 3;
    `);
  logger.info("Reverted serviceArea table with old content");
}
