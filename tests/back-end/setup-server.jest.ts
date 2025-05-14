import { execSync } from "child_process";
import { connectToDatabase, startServer, stopServer } from "back-end/index";

const name = import.meta.env.VITE_.CONTAINER_NAME;
// Allow additional time for integration tests.
// TODO: Move when https://github.com/jestjs/jest/issues/11543 is resolved.
jest.setTimeout(10000);

beforeAll(async () => {
  execSync(`docker compose -p ${name} up -d test-db`, {
    env: import.meta.env.VITE_,
    stdio: "inherit"
  });

  execSync("yarn migrations:latest", {
    env: import.meta.env.VITE_,
    stdio: "inherit"
  });

  await startServer({
    port: 3000 + Number(import.meta.env.VITE_.JEST_WORKER_ID)
  });
}, 40000);

afterAll(async () => {
  await stopServer();
  execSync(`docker compose -p ${name} down`);
});

export const connection = connectToDatabase();
