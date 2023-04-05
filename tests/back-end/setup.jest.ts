import { stopServer } from "back-end/index";
import { startServer } from "../../src/back-end/index";

beforeAll(async () => {
  await startServer();
});

afterAll(async () => {
  await stopServer();
});
