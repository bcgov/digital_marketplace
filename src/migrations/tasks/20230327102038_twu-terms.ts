import { generateUuid } from "back-end/lib";
import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

const slug = "team-with-us-terms-and-conditions";

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable("organizations", (table) => {
    table.timestamp("acceptedTWUTerms").nullable();
  });
  logger.info("Modified organizations table.");

  // Add TWU terms content initial value
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

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable("organizations", (table) => {
    table.dropColumn("acceptedTWUTerms");
  });
  logger.info("Reverted organizations table.");

  // Remove fixed TWU terms content
  await connection("content").where({ slug }).delete();
}
