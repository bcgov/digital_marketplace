import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import { Knex } from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

export async function up(connection: Knex): Promise<void> {
  await connection.schema.createTable("swuEvaluators", (table) => {
    table.uuid("id").primary().unique().notNullable();
    table
      .uuid("opportunityVersion")
      .references("id")
      .inTable("swuOpportunityVersions")
      .notNullable()
      .onDelete("CASCADE");
    table
      .uuid("user")
      .references("id")
      .inTable("users")
      .notNullable()
      .onDelete("CASCADE");
    table.boolean("chair").notNullable().defaultTo(false).notNullable();
    table.integer("order").notNullable();
  });
  logger.info("Created swuEvaluators table.");

  await connection.schema.createTable("twuEvaluators", (table) => {
    table.uuid("id").primary().unique().notNullable();
    table
      .uuid("opportunityVersion")
      .references("id")
      .inTable("twuOpportunityVersions")
      .notNullable()
      .onDelete("CASCADE");
    table
      .uuid("user")
      .references("id")
      .inTable("users")
      .notNullable()
      .onDelete("CASCADE");
    table.boolean("chair").notNullable().defaultTo(false).notNullable();
    table.integer("order").notNullable();
  });
  logger.info("Created twuEvaluators table.");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.dropTable("swuEvaluators");
  logger.info("Dropped table swuEvaluators");

  await connection.schema.dropTable("twuEvaluators");
  logger.info("Dropped table twuEvaluators");
}
