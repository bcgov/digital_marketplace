import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import Knex from "knex";
import { GOV_IDP_SUFFIX, VENDOR_IDP_SUFFIX } from "shared/config";
import { UserType } from "shared/lib/resources/user";

const logger = makeDomainLogger(consoleAdapter, "migrations");

export async function up(connection: Knex): Promise<void> {
  const results = await connection<{ id: string; idpUsername: string }>("users")
    .select("id", "idpUsername")
    .where((q) =>
      q
        .where("idpUsername", "LIKE", `%@${VENDOR_IDP_SUFFIX}`)
        .andWhere("type", "=", UserType.Vendor)
    )
    .orWhere((q) =>
      q
        .where("idpUsername", "LIKE", `%@${GOV_IDP_SUFFIX}`)
        .andWhere("type", "=", UserType.Admin)
    )
    .orWhere((q) =>
      q
        .where("idpUsername", "LIKE", `%@${VENDOR_IDP_SUFFIX}`)
        .andWhere("type", "=", UserType.Admin)
    )
    .orWhere((q) =>
      q
        .where("idpUsername", "LIKE", `%@${GOV_IDP_SUFFIX}`)
        .andWhere("type", "=", UserType.Government)
    );

  for (const result of results) {
    const withoutSuffix = result.idpUsername.slice(
      0,
      result.idpUsername.lastIndexOf("@")
    );
    await connection("users").where({ id: result.id }).update({
      idpUsername: withoutSuffix
    });
    logger.info(
      `Changed username '${result.idpUsername}' to '${withoutSuffix}`
    );
  }
  logger.info("Completed updating users table.");
}

// eslint-disable-next-line
export async function down(connection: Knex): Promise<void> {
  logger.info("Unable to reverse one-way migration of username modification.");
}
