import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

export async function up(connection: Knex): Promise<void> {
  await connection.schema.createTable("content", (table) => {
    table.uuid("id").primary().unique().notNullable();
    table.timestamp("createdAt").notNullable();
    table.uuid("createdBy").references("id").inTable("users").notNullable();
    table.text("slug").unique().notNullable();
    table.boolean("fixed").notNullable().defaultTo(false);
  });

  logger.info("Completed creating content table.");

  await connection.schema.createTable("contentVersions", (table) => {
    table.integer("id").notNullable();
    table.text("title").notNullable();
    table.text("body");
    table.timestamp("createdAt").notNullable();
    table.uuid("createdBy").references("id").inTable("users").notNullable();
    table
      .uuid("contentId")
      .references("id")
      .inTable("content")
      .notNullable()
      .onDelete("CASCADE");
    table.primary(["id", "contentId"]);
    table.index(["createdAt"]);
  });

  logger.info("Completed creating contentVersions table.");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.dropTable("contentVersions");
  logger.info("Completed dropping contentVersions table.");
  await connection.schema.dropTable("content");
  logger.info("Completed dropping content table.");
}
