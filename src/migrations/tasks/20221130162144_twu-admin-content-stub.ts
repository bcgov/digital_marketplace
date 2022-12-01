import { generateUuid } from "back-end/lib";
import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations", "development");

const slugs = ["team-with-us-opportunity-guide"];

async function insertFixedContent(connection: Knex, slug: string) {
  const now = new Date();
  const body = "Initial version";
  const id = generateUuid();
  await connection("content").insert({ id, createdAt: now, slug, fixed: true });
  await connection("contentVersions").insert({
    id: 1,
    title: slug,
    body,
    createdAt: now,
    contentId: id
  });
}

async function deleteFixedContent(connection: Knex, slug: string) {
  await connection("content").where({ slug }).delete();
}

export async function up(connection: Knex): Promise<void> {
  // Modify content tables to allow for NULL createdBy values
  await connection.schema.alterTable("content", (table) => {
    table.uuid("createdBy").nullable().alter();
  });
  logger.info("Completed modifying content table.");

  await connection.schema.alterTable("contentVersions", (table) => {
    table.uuid("createdBy").nullable().alter();
  });
  logger.info("Completed modifying contentVersions table.");

  // Add stub content initial values
  await Promise.all(
    slugs.map(async (slug) => await insertFixedContent(connection, slug))
  );
}

export async function down(connection: Knex): Promise<void> {
  // Remove fixed slug content
  await Promise.all(
    slugs.map(async (slug) => await deleteFixedContent(connection, slug))
  );

  // Revert modifications to content tables
  await connection.schema.alterTable("content", (table) => {
    table.uuid("createdBy").notNullable().alter();
  });
  logger.info("Completed reverting content table.");

  await connection.schema.alterTable("contentVersions", (table) => {
    table.uuid("createdBy").notNullable().alter();
  });
  logger.info("Completed reverting contentVersions table.");
}
