import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import { Knex } from "knex";

makeDomainLogger(consoleAdapter, "migrations");

export async function up(connection: Knex): Promise<void> {
  await connection.schema.alterTable("users", (table) => {
    table.dropColumn("notificationsOn");
    table.dropColumn("acceptedTerms");
  });

  await connection.schema.alterTable("users", (table) => {
    table.timestamp("notificationsOn").nullable();
    table.timestamp("acceptedTerms").nullable();
    table
      .uuid("avatarImageUrl")
      .references("id")
      .inTable("files")
      .nullable()
      .alter();
    table.renameColumn("avatarImageUrl", "avatarImageFile");

    // Add columns for tracking deactivation date/actor
    table.timestamp("deactivatedOn");
    table.uuid("deactivatedBy").references("id").inTable("users");
  });
}

export async function down(connection: Knex): Promise<void> {
  await connection.schema.alterTable("users", (table) => {
    table.dropColumn("deactivatedOn");
    table.dropColumn("deactivatedBy");
    table.dropColumn("notificationsOn");
    table.dropColumn("acceptedTerms");
    table.dropForeign(["avatarImageUrl"]);
    table.renameColumn("avatarImageFile", "avatarImageUrl");
  });

  await connection.schema.alterTable("users", (table) => {
    table.boolean("notificationsOn").defaultTo(false);
    table.boolean("acceptedTerms").defaultTo(false);
    table.string("avatarImageUrl").alter();
  });
}
