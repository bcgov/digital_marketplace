import { generateUuid } from "back-end/lib";
import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import { Knex } from "knex";
import { UserStatus, UserType } from "shared/lib/resources/user";

const logger = makeDomainLogger(consoleAdapter, "migrations");

const MIGRATION_IDP_USERNAME = "migration_evaluation_panel_member";

export async function up(connection: Knex): Promise<void> {
  const now = new Date();
  const id = generateUuid();
  await connection("users").insert(
    {
      id,
      createdAt: now,
      updatedAt: now,
      type: UserType.Government,
      status: UserStatus.Active,
      name: MIGRATION_IDP_USERNAME.toUpperCase(),
      idpUsername: MIGRATION_IDP_USERNAME,
      idpId: MIGRATION_IDP_USERNAME
    },
    [
      "id",
      "createdAt",
      "updatedAt",
      "type",
      "status",
      "name",
      "idpUsername",
      "idpId"
    ]
  );

  await connection.schema.createTable("swuEvaluationPanelMembers", (table) => {
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
  });

  await connection.schema.raw(`
    ALTER TABLE "swuEvaluationPanelMembers"
    ADD CONSTRAINT "evaluatorOrChair" check(
      "evaluator" = true OR "chair" = true
    )
  `);
  logger.info("Created swuEvaluationPanelMembers table.");

  const swuOpportunitiesQuery = connection("swuOpportunities as opportunities")
    .join(
      connection.raw(
        "(??) as versions",
        connection("swuOpportunityVersions")
          .select("opportunity", "id")
          .rowNumber("rn", function () {
            this.orderBy("createdAt", "desc").partitionBy("opportunity");
          })
      ),
      function () {
        this.on("opportunities.id", "=", "versions.opportunity");
      }
    )
    .where({
      "versions.rn": 1
    });

  await connection
    .from(
      connection.raw("?? (??, ??, ??, ??, ??)", [
        "swuEvaluationPanelMembers",
        "opportunityVersion",
        "user",
        "chair",
        "evaluator",
        "order"
      ])
    )
    .insert(
      swuOpportunitiesQuery.select(
        "versions.id as opportunityVersion",
        "opportunities.createdBy as user",
        connection.raw("true as chair"),
        connection.raw("true as evaluator"),
        connection.raw("0 as order")
      )
    );
  logger.info("Ported opportunity creator to SWU evaluation panel chair");

  await connection
    .from(
      connection.raw("?? (??, ??, ??, ??, ??)", [
        "swuEvaluationPanelMembers",
        "opportunityVersion",
        "user",
        "chair",
        "evaluator",
        "order"
      ])
    )
    .insert(
      swuOpportunitiesQuery
        .clearSelect()
        .select(
          "versions.id as opportunityVersion",
          connection.raw("? as user", [id]),
          connection.raw("false as chair"),
          connection.raw("true as evaluator"),
          connection.raw("1 as order")
        )
    );

  logger.info("Added migration user as SWU evaluation panel evaluator");

  await connection.schema.createTable("twuEvaluationPanelMembers", (table) => {
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

  const twuOpportunitiesQuery = connection("twuOpportunities as opportunities")
    .join(
      connection.raw(
        "(??) as versions",
        connection("twuOpportunityVersions")
          .select("opportunity", "id")
          .rowNumber("rn", function () {
            this.orderBy("createdAt", "desc").partitionBy("opportunity");
          })
      ),
      function () {
        this.on("opportunities.id", "=", "versions.opportunity");
      }
    )
    .where({
      "versions.rn": 1
    });

  await connection
    .from(
      connection.raw("?? (??, ??, ??, ??, ??)", [
        "twuEvaluationPanelMembers",
        "opportunityVersion",
        "user",
        "chair",
        "evaluator",
        "order"
      ])
    )
    .insert(
      twuOpportunitiesQuery.select(
        "versions.id as opportunityVersion",
        "opportunities.createdBy as user",
        connection.raw("true as chair"),
        connection.raw("true as evaluator"),
        connection.raw("0 as order")
      )
    );
  logger.info("Ported opportunity creator to TWU evaluation panel chair");

  await connection
    .from(
      connection.raw("?? (??, ??, ??, ??, ??)", [
        "twuEvaluationPanelMembers",
        "opportunityVersion",
        "user",
        "chair",
        "evaluator",
        "order"
      ])
    )
    .insert(
      twuOpportunitiesQuery
        .clearSelect()
        .select(
          "versions.id as opportunityVersion",
          connection.raw("? as user", [id]),
          connection.raw("false as chair"),
          connection.raw("true as evaluator"),
          connection.raw("1 as order")
        )
    );
  logger.info("Added migration user as TWU evaluation panel evaluator");
}

export async function down(connection: Knex): Promise<void> {
  await connection("users")
    .where({ idpUsername: MIGRATION_IDP_USERNAME })
    .del();

  await connection.schema.dropTable("swuEvaluationPanelMembers");
  logger.info("Dropped table swuEvaluationPanelMembers");

  await connection.schema.dropTable("twuEvaluationPanelMembers");
  logger.info("Dropped table twuEvaluationPanelMembers");
}
