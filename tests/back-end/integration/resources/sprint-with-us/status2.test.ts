import {
  awardSWUProposal,
  closeSWUOpportunities,
  readOneSWUOpportunity,
  readOneSWUProposal,
  updateSWUOpportunityStatus,
  updateSWUOpportunityVersion,
  updateSWUProposalCodeChallengeScore,
  updateSWUProposalScenarioAndPriceScores,
  updateSWUProposalStatus,
  updateSWUProposalTeamQuestionScores
} from "back-end/lib/db";
import {
  setupSWUScenario1,
  testCreateSWUOpportunityParams
} from "../../helpers/swu-scenario-1";
import { SWUOpportunityStatus } from "shared/lib/resources/opportunity/sprint-with-us";
import { getValidValue } from "shared/lib/validation";
import { clearTestDatabase } from "../../helpers";
import { SWUProposalStatus } from "shared/lib/resources/proposal/sprint-with-us";
import { insertUserWithActiveSession } from "../../helpers/user";
import { connection } from "tests/back-end/setup-server.jest";
import { UserType } from "shared/lib/resources/user";
import { buildCreateUserParams } from "tests/utils/generate/user";

describe("SWU Opportunity and Proposal Resources", () => {
  afterEach(async () => {
    await clearTestDatabase(connection);
  });

  it("should properly update opportunity and proposal statuses when an opportunity is closed and awarded, even if other proposals failed earlier stages", async () => {
    // Setup scenario (create an opportunity with two submitted vendor proposals)
    const { swuOpportunity, swuProposal1, swuProposal2, testAdminSession } =
      await setupSWUScenario1();

    // Update SWU opportunity status to Closed by setting date to in the past and calling hook
    const { status, ...updateParams } = testCreateSWUOpportunityParams;
    await updateSWUOpportunityVersion(
      connection,
      {
        ...updateParams,
        id: swuOpportunity.id,
        proposalDeadline: new Date("2000-01-01")
      },
      testAdminSession
    );

    await closeSWUOpportunities(connection);

    const closedOpportunity = getValidValue(
      await readOneSWUOpportunity(
        connection,
        swuOpportunity.id,
        testAdminSession
      ),
      null
    );
    expect(closedOpportunity?.status).toEqual(
      SWUOpportunityStatus.EvaluationTeamQuestions
    );

    // Validate that the SWU proposal statuses were updated to UnderReviewQuestions
    const updatedProposalTQ1 = getValidValue(
      await readOneSWUProposal(connection, swuProposal1.id, testAdminSession),
      null
    );

    const updatedProposalTQ2 = getValidValue(
      await readOneSWUProposal(connection, swuProposal2.id, testAdminSession),
      null
    );

    if (!updatedProposalTQ1 || !updatedProposalTQ2) {
      throw new Error("Failed to retrieve proposals");
    }

    expect(updatedProposalTQ1?.status).toEqual(
      SWUProposalStatus.UnderReviewTeamQuestions
    );
    expect(updatedProposalTQ2?.status).toEqual(
      SWUProposalStatus.UnderReviewTeamQuestions
    );

    // Score team questions on proposals and validate status
    const updatedProposalPostTQ1 = getValidValue(
      await updateSWUProposalTeamQuestionScores(
        connection,
        updatedProposalTQ1.id,
        [{ score: 80, order: 1 }],
        testAdminSession
      ),
      null
    );

    const updatedProposalPostTQ2 = getValidValue(
      await updateSWUProposalTeamQuestionScores(
        connection,
        updatedProposalTQ2.id,
        [{ score: 70, order: 1 }],
        testAdminSession
      ),
      null
    );

    if (!updatedProposalPostTQ1 || !updatedProposalPostTQ2) {
      throw new Error("Failed to retrieve proposals");
    }

    expect(updatedProposalPostTQ1?.status).toEqual(
      SWUProposalStatus.EvaluatedTeamQuestions
    );

    expect(updatedProposalPostTQ2?.status).toEqual(
      SWUProposalStatus.EvaluatedTeamQuestions
    );

    // Update opportunity status to EvaluationCodeChallenge
    const updatedOpportunity = getValidValue(
      await updateSWUOpportunityStatus(
        connection,
        swuOpportunity.id,
        SWUOpportunityStatus.EvaluationCodeChallenge,
        "Note",
        testAdminSession
      ),
      null
    );
    if (!updatedOpportunity) {
      throw new Error("Failed to update opportunity status");
    }

    expect(updatedOpportunity.status).toEqual(
      SWUOpportunityStatus.EvaluationCodeChallenge
    );

    // Screen in proposals to code challenge
    const updatedProposalCC1 = getValidValue(
      await updateSWUProposalStatus(
        connection,
        swuProposal1.id,
        SWUProposalStatus.UnderReviewCodeChallenge,
        "Note",
        testAdminSession
      ),
      null
    );

    const updatedProposalCC2 = getValidValue(
      await updateSWUProposalStatus(
        connection,
        swuProposal2.id,
        SWUProposalStatus.UnderReviewCodeChallenge,
        "Note",
        testAdminSession
      ),
      null
    );

    expect(updatedProposalCC1?.status).toEqual(
      SWUProposalStatus.UnderReviewCodeChallenge
    );
    expect(updatedProposalCC2?.status).toEqual(
      SWUProposalStatus.UnderReviewCodeChallenge
    );

    // Score code challenge on proposals and validate status
    const updatedProposalPostCC1 = getValidValue(
      await updateSWUProposalCodeChallengeScore(
        connection,
        updatedProposalTQ1.id,
        80,
        testAdminSession
      ),
      null
    );

    const updatedProposalPostCC2 = getValidValue(
      await updateSWUProposalCodeChallengeScore(
        connection,
        updatedProposalTQ2.id,
        40,
        testAdminSession
      ),
      null
    );

    expect(updatedProposalPostCC1?.status).toEqual(
      SWUProposalStatus.EvaluatedCodeChallenge
    );
    expect(updatedProposalPostCC2?.status).toEqual(
      SWUProposalStatus.EvaluatedCodeChallenge
    );

    // Update opportunity status to EvaluationTeamScenario
    const updatedOpportunity2 = getValidValue(
      await updateSWUOpportunityStatus(
        connection,
        swuOpportunity.id,
        SWUOpportunityStatus.EvaluationTeamScenario,
        "Note",
        testAdminSession
      ),
      null
    );
    if (!updatedOpportunity2) {
      throw new Error("Failed to update opportunity status");
    }

    expect(updatedOpportunity2.status).toEqual(
      SWUOpportunityStatus.EvaluationTeamScenario
    );

    // Screen in proposal 1 to team scenario (not proposal 2 since they failed)
    const updatedProposalTS1 = getValidValue(
      await updateSWUProposalStatus(
        connection,
        swuProposal1.id,
        SWUProposalStatus.UnderReviewTeamScenario,
        "Note",
        testAdminSession
      ),
      null
    );

    expect(updatedProposalTS1?.status).toEqual(
      SWUProposalStatus.UnderReviewTeamScenario
    );

    // Score team scenario on proposals and validate status
    const updatedProposalPostTS1 = getValidValue(
      await updateSWUProposalScenarioAndPriceScores(
        connection,
        updatedProposalTQ1.id,
        80,
        testAdminSession
      ),
      null
    );

    expect(updatedProposalPostTS1?.status).toEqual(
      SWUProposalStatus.EvaluatedTeamScenario
    );

    // Award proposal 1
    const awardedProposal = getValidValue(
      await awardSWUProposal(
        connection,
        swuProposal1.id,
        "Note",
        testAdminSession
      ),
      null
    );

    if (!awardedProposal) {
      throw new Error("Failed to award proposal");
    }

    expect(awardedProposal.status).toEqual(SWUProposalStatus.Awarded);

    // Validate opportunity status
    const awardedOpportunity = getValidValue(
      await readOneSWUOpportunity(
        connection,
        swuOpportunity.id,
        testAdminSession
      ),
      null
    );

    expect(awardedOpportunity?.status).toEqual(SWUOpportunityStatus.Awarded);

    // Validate non-awarded proposal status
    const nonAwardedProposal = getValidValue(
      await readOneSWUProposal(connection, swuProposal2.id, testAdminSession),
      null
    );

    expect(nonAwardedProposal?.status).toEqual(SWUProposalStatus.NotAwarded);

    // Read non-awarded proposal status with a gov user session
    const [, govUserSession] = await insertUserWithActiveSession(
      buildCreateUserParams({
        type: UserType.Government
      }),
      connection
    );

    if (!govUserSession) {
      throw new Error("Failed to create gov user session");
    }

    const nonAwardedProposalGov = getValidValue(
      await readOneSWUProposal(connection, swuProposal2.id, govUserSession),
      null
    );

    expect(nonAwardedProposalGov?.status).toEqual(SWUProposalStatus.NotAwarded);
  });
});
