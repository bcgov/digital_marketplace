import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import { Knex } from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

export async function up(connection: Knex): Promise<void> {
  await connection.schema.createTable("swuEvaluationPanelMembers", (table) => {
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
    table.boolean("evaluator").notNullable().defaultTo(true).notNullable();
    table.integer("order").notNullable();
  });

  await connection.schema.raw(`
    ALTER TABLE "swuEvaluationPanelMembers"
    ADD CONSTRAINT "evaluatorOrChair" check(
      "evaluator" = true OR "chair" = true
    )
  `);

  logger.info("Created swuEvaluationPanelMembers table.");

  await connection.schema.createTable("twuEvaluationPanelMembers", (table) => {
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
    table.boolean("evaluator").notNullable().defaultTo(false).notNullable();
    table.integer("order").notNullable();
    table.primary(["opportunityVersion", "user"]);
  });

  await connection.schema.raw(`
    ALTER TABLE "twuEvaluationPanelMembers"
    ADD CONSTRAINT "evaluatorOrChair" check(
      "evaluator" = true OR "chair" = true
    )
  `);

  logger.info("Created twuEvaluationPanelMembers table.");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.dropTable("swuEvaluationPanelMembers");
  logger.info("Dropped table swuEvaluationPanelMembers");

  await connection.schema.dropTable("twuEvaluationPanelMembers");
  logger.info("Dropped table twuEvaluationPanelMembers");
}
