import { PG_CONFIG } from "back-end/config";
import { connectToDatabase } from "back-end/index";

export async function clearTestDatabase(): Promise<void> {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Attempt to call test utility in non-test environment");
  }

  const connection = await connectToDatabase(PG_CONFIG);
  await connection.raw(
    `
      DELETE FROM "digmkt-test".sessions;
      DELETE FROM "digmkt-test".users;
    `
  );
}
