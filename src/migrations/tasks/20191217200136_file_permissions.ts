import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

export async function up(connection: Knex): Promise<void> {
  await connection.schema.renameTable(
    "fileReadPermissions",
    "filePermissionsUserType"
  );
  logger.info("Renamed table fileReadPermissions -> filePermissionsUserType");

  await connection.schema.createTable("filePermissionsPublic", (table) => {
    table
      .uuid("file")
      .primary()
      .references("id")
      .inTable("files")
      .notNullable();
  });
  logger.info("Created filePermissionsPublic table.");

  await connection.schema.createTable("filePermissionsUser", (table) => {
    table.uuid("file").references("id").inTable("files").notNullable();
    table.uuid("user").references("id").inTable("users").notNullable();

    table.primary(["file", "user"]);
  });
  logger.info("Created filePermissionsUser table.");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.renameTable(
    "filePermissionsUserType",
    "fileReadPermissions"
  );
  logger.info("Renamed table filePermissionsUserType -> fileReadPermissions");

  await connection.schema.dropTableIfExists("filePermissionsPublic");
  logger.info("Dropped table filePermissionsPublic");

  await connection.schema.dropTableIfExists("filePermissionsUser");
  logger.info("Dropped table filePermissionsUser");
}
