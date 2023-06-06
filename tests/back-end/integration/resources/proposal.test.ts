import { clearTestDatabase } from "../helpers";
import { setupCWUScenario1 } from "../helpers/scenario";

describe("CWU Proposal Resource", () => {
  afterEach(async () => {
    await clearTestDatabase();
  });

  it("should properly updated proposal statuses when a proposal is awarded", async () => {
    await setupCWUScenario1();
  });
});
