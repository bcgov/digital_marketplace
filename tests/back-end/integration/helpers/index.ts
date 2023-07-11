import { Connection } from "back-end/lib/db";

export async function clearTestDatabase(connection: Connection): Promise<void> {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Attempt to call test utility in non-test environment");
  }

  await connection.raw(
    `
      DELETE FROM "digmkt-test"."cwuOpportunities";
      DELETE FROM "digmkt-test".sessions;
      DELETE FROM "digmkt-test".users;
    `
  );
}

export function jsonClone(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}
