import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

enum TWUServiceArea {
  Developer = "DEVELOPER",
  DataSpecialist = "DATA_SPECIALIST",
  ScrumMaster = "SCRUM_MASTER",
  DevopsSpecialist = "DEVOPS_SPECIALIST"
}

export async function up(connection: Knex): Promise<void> {
  // Service Areas
  await connection.schema.createTable("serviceAreas", (table) => {
    table.increments("id").primary().unique().notNullable();
    table.enu("serviceArea", Object.values(TWUServiceArea)).notNullable();
    table.string("name").notNullable();
  });
  Object.keys(TWUServiceArea).forEach(async (key) => {
    await connection("serviceAreas").insert({
      serviceArea: TWUServiceArea[key as keyof typeof TWUServiceArea],
      name: key
    });
  });
  logger.info("Created serviceAreas table");

  // Organization Service Areas
  await connection.schema.createTable(
    "twuOrganizationServiceAreas",
    (table) => {
      table.integer("serviceArea").references("id").inTable("serviceAreas");
      table.uuid("organization").references("id").inTable("organizations");
      table.primary(["serviceArea", "organization"]);
    }
  );
  logger.info("Created twuOrganizationServiceAreas table");

  await connection.schema.createTable("twuResources", (table) => {
    table.uuid("id").primary().unique().notNullable();
    table.integer("serviceArea").references("id").inTable("serviceAreas");
    table
      .uuid("opportunityVersion")
      .references("id")
      .inTable("twuOpportunityVersions");
    table.integer("targetAllocation").notNullable();
    table.specificType("mandatorySkills", "text ARRAY").notNullable();
    table.specificType("optionalSkills", "text ARRAY").notNullable();
  });
  logger.info("Created twuResources table");

  await connection.schema.alterTable("twuOpportunityVersions", (table) => {
    table.dropColumn("serviceArea");
    table.dropColumn("targetAllocation");
    table.dropColumn("mandatorySkills");
    table.dropColumn("optionalSkills");
  });
  logger.info(
    "Removed serviceArea, targetAllocation, mandatorySkills, and optionalSkills from twuOpportunityVersions"
  );
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable("twuOpportunityVersions", (table) => {
    table
      .enu("serviceArea", Object.values(TWUServiceArea))
      .defaultTo(TWUServiceArea.Developer)
      .notNullable();
    table.integer("targetAllocation").defaultTo(100).notNullable();
    table
      .specificType("mandatorySkills", "text ARRAY")
      .defaultTo("{}")
      .notNullable();
    table
      .specificType("optionalSkills", "text ARRAY")
      .defaultTo("{}")
      .notNullable();
  });
  // Populate a twuOpportunityVersion with any related resource's details.
  await connection.raw(`
    UPDATE
      "twuOpportunityVersions" tov
    SET
      "serviceArea" = sa."serviceArea",
      "targetAllocation" = tr."targetAllocation",
      "mandatorySkills" = tr."mandatorySkills",
      "optionalSkills" = tr."optionalSkills"
    FROM
      "serviceAreas" sa
      JOIN "twuResources" tr ON sa.id = tr."serviceArea"
    WHERE
      tov.id = tr."opportunityVersion";
  `);
  logger.info(
    "Reverted removing serviceArea, targetAllocation, mandatorySkills, and optionalSkills from twuOpportunityVersions"
  );

  await connection.schema.dropTable("twuResources");
  logger.info("Dropped table twuResources");

  await connection.schema.dropTable("twuOrganizationServiceAreas");
  logger.info("Dropped table twuOrganizationServiceAreas");

  await connection.schema.dropTable("serviceAreas");
  logger.info("Dropped table serviceAreas");
}
