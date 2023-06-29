import { connectToDatabase, startServer, stopServer } from "back-end/index";
import { PG_CONFIG } from "back-end/config";
import { Connection } from "back-end/lib/db";

let connection: Connection;

beforeAll(async () => {
  connection = connectToDatabase(PG_CONFIG);
  await startServer({
    port: 3000 + Number(process.env.JEST_WORKER_ID)
  });
});

afterAll(async () => {
  await stopServer();
  await connection.destroy();
});

export { connection };
