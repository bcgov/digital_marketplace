import { app } from "back-end/index";
import { agent, SuperAgentTest } from "supertest";

describe("basic functionality tests", () => {
  let appAgent: SuperAgentTest;

  beforeAll(() => {
    appAgent = agent(app);
  });

  test("status endpoint is returning a 200 response", async () => {
    const result = await appAgent.get("/status");
    expect(result.status).toEqual(200);
  });
});
