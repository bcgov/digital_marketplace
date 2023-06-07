import { PG_CONFIG } from "back-end/config";
import { connectToDatabase } from "back-end/index";
import {
  awardCWUProposal,
  closeCWUOpportunities,
  readOneCWUOpportunity,
  readOneCWUProposal,
  updateCWUOpportunityVersion
} from "back-end/lib/db";
import { CWUOpportunityStatus } from "shared/lib/resources/opportunity/code-with-us";
import { CWUProposalStatus } from "shared/lib/resources/proposal/code-with-us";
import { getValidValue } from "shared/lib/validation";
import { clearTestDatabase } from "../../helpers";
import {
  setupCWUScenario1,
  testCreateCWUOpportunityParams
} from "../../helpers/cwu-scenario-1";

describe("CWU Proposal Resource", () => {
  afterEach(async () => {
    await clearTestDatabase();
  });

  it("should properly update opportunity and proposal statuses when an opportunity is closed and awarded", async () => {
    const connection = await connectToDatabase(PG_CONFIG);

    // Setup scenario (create an opportunity with two submitted vendor proposals)
    const { cwuOpportunity, cwuProposal1, cwuProposal2, testAdminSession } =
      await setupCWUScenario1();

    // Update CWU opportunity status to Closed by setting date to in the past and calling hook
    await updateCWUOpportunityVersion(
      connection,
      {
        ...testCreateCWUOpportunityParams,
        id: cwuOpportunity.id,
        proposalDeadline: new Date("2000-01-01")
      },
      testAdminSession
    );

    await closeCWUOpportunities(connection);

    const closedOpportunity = getValidValue(
      await readOneCWUOpportunity(
        connection,
        cwuOpportunity.id,
        testAdminSession
      ),
      null
    );
    expect(closedOpportunity?.status).toEqual(CWUOpportunityStatus.Evaluation);

    // Validate that the CWU proposal statuses were updated to UnderReview
    const updatedProposal1 = getValidValue(
      await readOneCWUProposal(connection, cwuProposal1.id, testAdminSession),
      null
    );

    const updatedProposal2 = getValidValue(
      await readOneCWUProposal(connection, cwuProposal2.id, testAdminSession),
      null
    );

    expect(updatedProposal1?.status).toEqual(CWUProposalStatus.UnderReview);
    expect(updatedProposal2?.status).toEqual(CWUProposalStatus.UnderReview);

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
