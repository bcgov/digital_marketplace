import { PG_CONFIG } from "back-end/config";
import { connectToDatabase } from "back-end/index";
import {
  awardCWUProposal,
  readOneCWUProposal,
  updateCWUOpportunityStatus
} from "back-end/lib/db";
import { CWUOpportunityStatus } from "shared/lib/resources/opportunity/code-with-us";
import { CWUProposalStatus } from "shared/lib/resources/proposal/code-with-us";
import { getValidValue } from "shared/lib/validation";
import { clearTestDatabase } from "../helpers";
import { setupCWUScenario1 } from "../helpers/scenario";
//import { agent, SuperAgentTest } from "supertest";
//import { app } from "back-end/index";

describe("CWU Proposal Resource", () => {
  //let appAgent: SuperAgentTest;

  //beforeEach(() => {
  //appAgent = agent(app);
  //});

  afterEach(async () => {
    await clearTestDatabase();
  });

  it("should properly updated proposal statuses when a proposal is awarded", async () => {
    const connection = await connectToDatabase(PG_CONFIG);

    // Setup scenario (create an opportunity with two submitted vendor proposals)
    const { cwuOpportunity, cwuProposal1, cwuProposal2, testAdminSession } =
      await setupCWUScenario1();

    // Update CWU opportunity status to Closed
    await updateCWUOpportunityStatus(
      connection,
      cwuOpportunity.id,
      CWUOpportunityStatus.Evaluation,
      "Note",
      testAdminSession
    );

    // Award first proposal
    const awardedProposal = getValidValue(
      await awardCWUProposal(
        connection,
        cwuProposal1.id,
        "Note",
        testAdminSession
      ),
      null
    );
    if (!awardedProposal) {
      throw new Error("Failed to award proposal");
    }

    expect(awardedProposal.status).toEqual(CWUProposalStatus.Awarded);

    // Retrieve second proposal
    const nonAwardedProposal = getValidValue(
      await readOneCWUProposal(connection, cwuProposal2.id, testAdminSession),
      null
    );
    if (!nonAwardedProposal) {
      throw new Error("Failed to retrieve proposal");
    }

    // Validate that the second proposal was not awarded
    expect(nonAwardedProposal.status).toEqual(CWUProposalStatus.NotAwarded);
  });
});
