import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import { Knex } from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

enum MembershipType {
  Owner = "OWNER",
  Member = "MEMBER",
  Admin = "ADMIN"
}

enum PreviousMembershipType {
  Owner = "OWNER",
  Member = "MEMBER"
}

export async function up(connection: Knex): Promise<void> {
  await connection.schema.raw(
    ' \
    ALTER TABLE "affiliations" \
    DROP CONSTRAINT "affiliations_membershipType_check" \
  '
  );

  await connection.schema.raw(` \
    ALTER TABLE "affiliations" \
    ADD CONSTRAINT "affiliations_membershipType_check" \
    CHECK ("membershipType" IN ('${Object.values(MembershipType).join(
      "','"
    )}')) \
  `);
  logger.info("Completed modifying affiliations table.");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.raw(
    ' \
    ALTER TABLE "affiliations" \
    DROP CONSTRAINT "affiliations_membershipType_check" \
  '
  );

  await connection("affiliations")
    .where({ membershipType: MembershipType.Admin })
    .update({ membershipType: PreviousMembershipType.Member });

  await connection.schema.raw(` \
    ALTER TABLE "affiliations" \
    ADD CONSTRAINT "affiliations_membershipType_check" \
    CHECK ("membershipType" IN ('${Object.values(PreviousMembershipType).join(
      "','"
    )}')) \
  `);
  logger.info("Completed reverting affiliations table.");
}
