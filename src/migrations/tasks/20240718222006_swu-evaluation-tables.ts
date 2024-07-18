import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import { Knex } from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

enum SWUTeamQuestionResponseEvaluationType {
  Conensus = "CONSENSUS",
  Individual = "INDIVIDUAL"
}

export async function up(connection: Knex): Promise<void> {
  await connection.schema.createTable(
    "swuTeamQuestionResponseEvaluations",
    (table) => {
      table
        .uuid("opportunity")
        .references("id")
        .inTable("swuOpportunities")
        .notNullable()
        .onDelete("CASCADE");
      table
        .uuid("proposal")
        .references("id")
        .inTable("swuProposals")
        .notNullable()
        .onDelete("CASCADE");
      table
        .uuid("evaluationPanelMember")
        .references("id")
        .inTable("swuEvaluationPanelMembers")
        .notNullable()
        .onDelete("CASCADE");
      table.uuid("id").primary().unique().notNullable();
      table
        .enu("type", Object.values(SWUTeamQuestionResponseEvaluationType))
        .notNullable();
    }
  );
  logger.info("Created swuTeamQuestionResponseEvaluations table.");

  await connection.schema.createTable(
    "swuTeamQuestionResponseEvaluationScores",
    (table) => {
      table
        .uuid("teamQuestionResponseEvaluation")
        .references("id")
        .inTable("swuTeamQuestionResponseEvaluations")
        .notNullable()
        .onDelete("CASCADE");
      table.float("score").notNullable();
      table.text("notes").notNullable();
    }
  );
  logger.info("Created swuTeamQuestionResponseEvaluations table.");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.dropTable("swuTeamQuestionResponseEvaluationScores");
  logger.info("Dropped table swuTeamQuestionResponseEvaluationScores");

  await connection.schema.dropTable("swuTeamQuestionResponseEvaluations");
  logger.info("Dropped table swuTeamQuestionResponseEvaluations");
}
