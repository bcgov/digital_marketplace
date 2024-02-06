import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

export async function up(connection: Knex): Promise<void> {
  /**
   * Adds a new column to the twuProposalMember table to store the TWUResource
   * ids
   */
  await connection.schema.alterTable("twuProposalMember", function (table) {
    table
      .uuid("twuResource")
      .references("id")
      .inTable("twuResources")
      .onDelete("CASCADE");
  });

  logger.info("Added twuResource column to twuProposalMember table");

  /**
   * Obtains records of previously created opportunities and relevant proposals
   * where there was only one resource per proposal (for TWU). All the
   * resourceIds are populated in the new column prior to it being declared
   * as not null.
   */
  const records = await connection("twuProposalMember")
    .select("member.proposal", "resources.id")
    .from("twuProposalMember as member")
    .innerJoin("twuProposals as proposal", "member.proposal", "proposal.id")
    .innerJoin("twuOpportunityVersions as versions", function () {
      this.on("proposal.opportunity", "versions.opportunity").andOn(
        "versions.createdAt",
        connection.raw(`(select max("createdAt")
                                                   from "twuOpportunityVersions" as versions2
                                                   where versions2.opportunity = proposal.opportunity)`)
      );
    })
    .innerJoin(
      "twuResources as resources",
      "versions.id",
      "resources.opportunityVersion"
    );

  /**
   * iterates through the records and updates the new twuResource column in the
   * twuProposalMember table with the relevant resourceId. Prior to this point
   * in time, there was one and only one ServiceArea/resourceId per TWU
   * opportunity, so we are guaranteed the resourceId to be correct. This
   * is done so that the column can later be declared NOT NULL.
   *
   * If the one and only one ServiceArea/resourceId per TWU opportunity can NOT
   * be guaranteed such as in a situation where this migration is performed,
   * multiple TWU resources are added, saved and proposals are made with multiple
   * resources, there is less guarantee that the above query being free from
   * issues.
   */
  for (const record of records) {
    await connection("twuProposalMember")
      .update({ twuResource: record.id })
      .where({ proposal: record.proposal });
  }

  logger.info(
    "Added default data (resource ids) to twuResource column in the twuProposalMember table"
  );

  /**
   * after data has been added, we can declare that it be NOT NULL
   */
  await connection.schema.alterTable("twuProposalMember", function (table) {
    table.uuid("twuResource").notNullable().alter();
  });

  logger.info("Added NOT NULL property to the column");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable("twuProposalMember", function (table) {
    table.dropColumn("twuResource");
  });
  logger.info("Dropped twuResource column in the twuProposalMember table");
}
