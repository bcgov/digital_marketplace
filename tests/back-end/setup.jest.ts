import { connectToDatabase, startServer, stopServer } from "back-end/index";

beforeAll(async () => {
  await startServer({
    port: 3000 + Number(process.env.JEST_WORKER_ID)
  });
});

afterAll(async () => {
  await stopServer();
});

export const connection = connectToDatabase();
