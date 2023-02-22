import { generateUuid } from "back-end/lib";
import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

const slugs = ["team-with-us-opportunity-guide", "team-with-us-proposal-guide"];

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
  // Add stub content initial values
  await Promise.all(
    slugs.map(async (slug) => await insertFixedContent(connection, slug))
  );
  logger.info("Completed adding content slugs to content table.");
}

export async function down(connection: Knex): Promise<void> {
  // Remove fixed slug content
  await Promise.all(
    slugs.map(async (slug) => await deleteFixedContent(connection, slug))
  );
  logger.info("Completed reverting content table.");
}
