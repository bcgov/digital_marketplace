import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import { Knex } from "knex";

const logger = makeDomainLogger(consoleAdapter, "migrations");

enum AffiliationEvent {
  AdminStatusGranted = "ADMIN_STATUS_GRANTED",
  AdminStatusRevoked = "ADMIN_STATUS_REVOKED",
  OwnerStatusGranted = "OWNER_STATUS_GRANTED",
  OwnerStatusRevoked = "OWNER_STATUS_REVOKED"
}

enum PreviousAffiliationEvent {
  AdminStatusGranted = "ADMIN_STATUS_GRANTED",
  AdminStatusRevoked = "ADMIN_STATUS_REVOKED"
}

export async function up(connection: Knex): Promise<void> {
  await connection.schema.raw(
    ' \
    ALTER TABLE "affiliationEvents" \
    DROP CONSTRAINT "affiliationEvents_event_check" \
  '
  );

  await connection.schema.raw(` \
    ALTER TABLE "affiliationEvents" \
    ADD CONSTRAINT "affiliationEvents_event_check" \
    CHECK ("event" IN ('${Object.values(AffiliationEvent).join("','")}')) \
  `);
  logger.info("Completed modifying affiliationEvents table.");
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.raw(
    ' \
    ALTER TABLE "affiliationEvents" \
    DROP CONSTRAINT "affiliationEvents_event_check" \
  '
  );

  // Can't really change these events to anything else, so remove them.
  await connection("affiliations")
    .where({ event: AffiliationEvent.OwnerStatusGranted })
    .orWhere({ event: AffiliationEvent.OwnerStatusRevoked })
    .delete();

  await connection.schema.raw(` \
    ALTER TABLE "affiliationEvents" \
    ADD CONSTRAINT "affiliationEvents_event_check" \
    CHECK ("event" IN ('${Object.values(PreviousAffiliationEvent).join(
      "','"
    )}')) \
  `);
  logger.info("Completed reverting affiliationsEvents table.");
}
