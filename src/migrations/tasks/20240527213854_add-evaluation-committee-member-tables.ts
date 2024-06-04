import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import { Knex } from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

export async function up(connection: Knex): Promise<void> {
  await connection.schema.createTable(
    "swuEvaluationCommitteeMembers",
    (table) => {
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
      table.primary(["opportunityVersion", "user"]);
    }
  );

  await connection.schema.raw(`
    ALTER TABLE "swuEvaluationCommitteeMembers"
    ADD CONSTRAINT "evaluatorOrChair" check(
      "evaluator" = true OR "chair" = true
    )
  `);

  logger.info("Created swuEvaluationCommitteeMembers table.");

  await connection.schema.createTable(
    "twuEvaluationCommitteeMembers",
    (table) => {
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
    }
  );

  await connection.schema.raw(`
    ALTER TABLE "twuEvaluationCommitteeMembers"
    ADD CONSTRAINT "evaluatorOrChair" check(
      "evaluator" = true OR "chair" = true
    )
  `);

  logger.info("Created twuEvaluationCommitteeMembers table.");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.dropTable("swuEvaluationCommitteeMembers");
  logger.info("Dropped table swuEvaluationCommitteeMembers");

  await connection.schema.dropTable("twuEvaluationCommitteeMembers");
  logger.info("Dropped table twuEvaluationCommitteeMembers");
}
