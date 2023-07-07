import { execSync } from "child_process";
import { connectToDatabase, startServer, stopServer } from "back-end/index";

const name = process.env.CONTAINER_NAME;

beforeAll(async () => {
  execSync(`docker compose -p ${name} up -d test-db`, {
    env: process.env,
    stdio: "inherit"
  });

  execSync("yarn migrations:latest", {
    env: process.env,
    stdio: "inherit"
  });

  await startServer({
    port: 3000 + Number(process.env.JEST_WORKER_ID)
  });
});

afterAll(async () => {
  await stopServer();
  execSync(`docker compose -p ${name} down`);
});

export const connection = connectToDatabase();
