import { app } from "back-end/index";
import { clearTestDatabase } from "tests/back-end/integration/helpers";
import {
  insertUserWithActiveSession,
  requestWithCookie
} from "tests/back-end/integration/helpers/user";
import { connection } from "tests/back-end/setup-server.jest";
import { UserType } from "shared/lib/resources/user";
import { agent } from "supertest";
import {
  buildCreateUserParams,
  buildUserSlim
} from "tests/utils/generate/user";
import {
  buildSWUProposal,
  buildSWUProposalTeamQuestionResponse
} from "tests/utils/generate/proposals/sprint-with-us";
import { buildOrganization } from "tests/utils/generate/organization";
import { insertOrganization } from "tests/back-end/integration/helpers/organization";
import { omit, pick } from "lodash";
import { insertSWUOpportunity } from "tests/back-end/integration/helpers/opportunities/sprint-with-us";
import { buildCreateSWUOpportunityParams } from "tests/utils/generate/opportunities/sprint-with-us";
import {
  CreateRequestBody,
  SWUProposalEvent,
  SWUProposalStatus,
  UpdateTeamQuestionScoreBody
} from "shared/lib/resources/proposal/sprint-with-us";
import {
  SWUOpportunitySlim,
  SWUOpportunityStatus
} from "shared/lib/resources/opportunity/sprint-with-us";
import CAPABILITY_NAMES_ONLY from "shared/lib/data/capabilities";
import { fakerEN_CA as faker } from "@faker-js/faker";
import { getISODateString } from "shared/lib";
import { adt, arrayOfUnion } from "shared/lib/types";
import { insertAffiliation } from "tests/back-end/integration/helpers/affiliations";
import {
  MembershipStatus,
  MembershipType
} from "shared/lib/resources/affiliation";
import {
  closeSWUOpportunities,
  updateSWUOpportunityStatus,
  updateSWUOpportunityVersion
} from "back-end/lib/db/opportunity/sprint-with-us";
import { getValidValue } from "shared/lib/validation";
import { OrganizationSlim } from "shared/lib/resources/organization";

async function setup() {
  const [testUser, testUserSession] = await insertUserWithActiveSession(
    buildCreateUserParams({
      type: UserType.Vendor,
      capabilities: CAPABILITY_NAMES_ONLY
    }),
    connection
  );
  const [testAdmin, testAdminSession] = await insertUserWithActiveSession(
    buildCreateUserParams({ type: UserType.Admin }),
    connection
  );

  if (!(testAdminSession && testUserSession)) {
    throw new Error("Failed to create test sessions");
  }

  const userAppAgent = agent(app);
  const adminAppAgent = agent(app);
  return {
    testUser,
    testUserSession,
    testAdmin,
    testAdminSession,
    userAppAgent,
    adminAppAgent
  };
}

afterEach(async () => {
  await clearTestDatabase(connection);
});

test("sprint-with-us proposal crud", async () => {
  const {
    testUser,
    testUserSession,
    testAdmin,
    testAdminSession,
    userAppAgent,
    adminAppAgent
  } = await setup();

  const testUserSlim = buildUserSlim(testUser);
  const organization = await insertOrganization(
    connection,
    testUser.id,
    omit(
      buildOrganization({
        owner: testUserSlim,
        acceptedSWUTerms: faker.date.past()
      }),
      [
        "logoImageFile",
        "numTeamMembers",
        "owner",
        "possessAllCapabilities",
        "possessOneServiceArea",
        "serviceAreas"
      ]
    ),
    testUserSession
  );
  const { logoImageFile, ...organizationSlim } = pick(
    organization,
    arrayOfUnion<keyof OrganizationSlim>()([
      "owner",
      "acceptedSWUTerms",
      "acceptedTWUTerms",
      "possessAllCapabilities",
      "possessOneServiceArea",
      "numTeamMembers",
      "serviceAreas",
      "id",
      "legalName",
      "logoImageFile",
      "active",
      "viewerIsOrgAdmin"
    ])
  );

  const [testTeamMember, _] = await insertUserWithActiveSession(
    buildCreateUserParams({
      type: UserType.Vendor,
      capabilities: []
    }),
    connection
  );
  await insertAffiliation(connection, {
    user: testTeamMember.id,
    organization: organization.id,
    membershipStatus: MembershipStatus.Active,
    membershipType: MembershipType.Member
  });
  organizationSlim.numTeamMembers =
    organizationSlim.numTeamMembers && organizationSlim.numTeamMembers + 1;

  const opportunityParams = buildCreateSWUOpportunityParams({
    status: SWUOpportunityStatus.Published,
    proposalDeadline: faker.date.soon()
  });
  const opportunity = await insertSWUOpportunity(
    connection,
    opportunityParams,
    testAdminSession
  );

  const slimOpportunityProps = arrayOfUnion<keyof SWUOpportunitySlim>()([
    "status",
    "createdAt",
    "updatedAt",
    "createdBy",
    "updatedBy",
    "id",
    "title",
    "teaser",
    "remoteOk",
    "location",
    "totalMaxBudget",
    "proposalDeadline",
    "subscribed"
  ]);

  const opportunitySlim: SWUOpportunitySlim = pick(
    opportunity,
    slimOpportunityProps
  );

  const proposal = buildSWUProposal({
    createdBy: testUserSlim,
    organization: organizationSlim,
    opportunity: opportunitySlim,
    teamQuestionResponses: opportunity.teamQuestions.map(
      ({ order, wordLimit }) =>
        buildSWUProposalTeamQuestionResponse({
          order,
          response: faker.lorem.words({ min: 1, max: wordLimit })
        })
    )
  });

  if (!proposal.implementationPhase) {
    throw Error("Error creating test data");
  }

  const body: CreateRequestBody = {
    opportunity: opportunity.id,
    organization: organization.id,
    implementationPhase: {
      members: proposal.implementationPhase.members.map(
        ({ member, scrumMaster }) => ({ member: member.id, scrumMaster })
      ),
      proposedCost: opportunity.implementationPhase.maxBudget
    },
    references: proposal.references ?? [],
    attachments: [],
    teamQuestionResponses: proposal.teamQuestionResponses,
    status: SWUProposalStatus.Draft
  };
  const createRequest = userAppAgent
    .post("/api/proposals/sprint-with-us")
    .send(body);

  const createResult = await requestWithCookie(createRequest, testUserSession);
  expect(createResult.status).toEqual(201);
  expect(createResult.body).toMatchObject({
    ...body,
    implementationPhase: {
      ...body.implementationPhase,
      members: proposal.implementationPhase.members.map(
        ({ idpUsername, ...member }) => member
      )
    },
    opportunity: {
      ...omit(opportunitySlim, ["createdBy", "updatedBy", "subscribed"]),
      createdAt: getISODateString(opportunity, "createdAt"),
      updatedAt: getISODateString(opportunity, "updatedAt"),
      proposalDeadline: getISODateString(opportunity, "proposalDeadline")
    },
    organization: {
      ...organizationSlim,
      acceptedSWUTerms: getISODateString(organization, "acceptedSWUTerms")
    },
    teamQuestionResponses: expect.arrayContaining(body.teamQuestionResponses),
    createdBy: { id: testUser.id }
  });

  const deleteProposalId = createResult.body.id;
  const deleteProposalIdUrl = `/api/proposals/sprint-with-us/${deleteProposalId}`;

  const readManyBeforeDeleteResult = await userAppAgent.get(
    "/api/proposals/sprint-with-us"
  );

  expect(readManyBeforeDeleteResult.status).toEqual(200);
  expect(readManyBeforeDeleteResult.body).toHaveLength(1);
  expect(readManyBeforeDeleteResult.body).toEqual(
    expect.arrayContaining([
      omit(createResult.body, [
        "history",
        "attachments",
        "references",
        "teamQuestionResponses",
        "inceptionPhase",
        "implementationPhase",
        "prototypePhase"
      ])
    ])
  );

  const deleteResult = await userAppAgent.delete(deleteProposalIdUrl);

  expect(deleteResult.status).toEqual(200);
  expect(deleteResult.body).toEqual(createResult.body);

  const readManyAfterDeleteResult = await userAppAgent.get(
    "/api/proposals/sprint-with-us"
  );

  expect(readManyAfterDeleteResult.body).toHaveLength(0);

  const recreateResult = await userAppAgent
    .post("/api/proposals/sprint-with-us")
    .send(body);

  const proposalId = recreateResult.body.id;
  const proposalIdUrl = `/api/proposals/sprint-with-us/${proposalId}`;

  const readResult = await userAppAgent.get(proposalIdUrl);

  expect(readResult.status).toEqual(200);
  expect(readResult.body).toEqual(recreateResult.body);

  const editedBody = {
    ...body,
    implementationPhase: {
      ...body.implementationPhase,
      proposedCost: opportunity.implementationPhase.maxBudget - 500
    }
  };
  const editResult = await userAppAgent
    .put(proposalIdUrl)
    .send(adt("edit", editedBody));

  expect(editResult.status).toEqual(200);
  expect(editResult.body).toEqual({
    ...readResult.body,
    implementationPhase: {
      ...readResult.body.implementationPhase,
      proposedCost: editedBody.implementationPhase.proposedCost
    },
    teamQuestionResponses: expect.arrayContaining(
      readResult.body.teamQuestionResponses
    ),
    updatedAt: expect.any(String)
  });

  const submitResult = await userAppAgent
    .put(proposalIdUrl)
    .send(adt("submit"));

  expect(submitResult.status).toEqual(200);
  expect(submitResult.body).toEqual({
    ...editResult.body,
    status: SWUProposalStatus.Submitted,
    submittedAt: expect.any(String),
    history: [
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testUser.id }),
        type: adt("status", SWUProposalStatus.Submitted)
      }),
      ...editResult.body.history
    ],
    updatedAt: expect.any(String),
    createdAt: expect.any(String) // TODO: fix this after writing tests
  });

  const withdrawResult = await userAppAgent
    .put(proposalIdUrl)
    .send(adt("withdraw"));

  expect(withdrawResult.status).toEqual(200);
  expect(withdrawResult.body).toEqual({
    ...submitResult.body,
    status: SWUProposalStatus.Withdrawn,
    updatedAt: expect.any(String),
    createdAt: expect.any(String), // TODO: fix this after writing tests
    history: [
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testUser.id }),
        type: adt("status", SWUProposalStatus.Withdrawn)
      }),
      ...submitResult.body.history
    ]
  });

  const resubmitResult = await userAppAgent
    .put(proposalIdUrl)
    .send(adt("submit"));

  // Close the opportunity
  const newDeadline = faker.date.recent();
  await updateSWUOpportunityVersion(
    connection,
    {
      ...omit(opportunityParams, ["status"]),
      id: opportunity.id,
      proposalDeadline: newDeadline
    },
    testAdminSession
  );
  await closeSWUOpportunities(connection);

  const scoreQuestionsBody: UpdateTeamQuestionScoreBody[] =
    opportunity.teamQuestions.map(({ score, order }) => ({ score, order }));
  const scoreQuestionsRequest = adminAppAgent
    .put(proposalIdUrl)
    .send(adt("scoreQuestions", scoreQuestionsBody));
  const scoreQuestionsResult = await requestWithCookie(
    scoreQuestionsRequest,
    testAdminSession
  );

  expect(scoreQuestionsResult.status).toEqual(200);
  expect(scoreQuestionsResult.body).toEqual({
    // Proposals are anonymized prior to code challenge evaluation
    id: resubmitResult.body.id,
    submittedAt: resubmitResult.body.submittedAt,
    opportunity: {
      ...resubmitResult.body.opportunity,
      proposalDeadline: newDeadline.toISOString(),
      status: SWUOpportunityStatus.EvaluationTeamQuestions,
      updatedAt: expect.any(String),
      createdBy: expect.objectContaining({ id: testAdmin.id })
    },
    status: SWUProposalStatus.EvaluatedTeamQuestions,
    teamQuestionResponses: expect.arrayContaining(
      proposal.teamQuestionResponses.map((qr) => ({
        ...qr,
        score: scoreQuestionsBody.find(({ order }) => order === qr.order)?.score
      }))
    ),
    questionsScore: 100,
    anonymousProponentName: "Proponent 1",
    updatedAt: expect.any(String),
    createdAt: expect.any(String) // TODO: fix this after writing tests
  });

  const screenInToCodeChallengeResult = await adminAppAgent
    .put(proposalIdUrl)
    .send(adt("screenInToCodeChallenge"));

  expect(screenInToCodeChallengeResult.status).toEqual(200);
  expect(screenInToCodeChallengeResult.body).toEqual({
    ...scoreQuestionsResult.body,
    status: SWUProposalStatus.UnderReviewCodeChallenge,
    updatedAt: expect.any(String),
    createdAt: expect.any(String) // TODO: fix this after writing tests
  });

  const screenOutFromCodeChallengeResult = await adminAppAgent
    .put(proposalIdUrl)
    .send(adt("screenOutFromCodeChallenge"));

  expect(screenOutFromCodeChallengeResult.status).toEqual(200);
  expect(screenOutFromCodeChallengeResult.body).toEqual({
    ...screenInToCodeChallengeResult.body,
    status: SWUProposalStatus.EvaluatedTeamQuestions,
    updatedAt: expect.any(String),
    createdAt: expect.any(String) // TODO: fix this after writing tests
  });

  const rescreenInToCodeChallengeResult = await adminAppAgent
    .put(proposalIdUrl)
    .send(adt("screenInToCodeChallenge"));

  const codeChallengeOpportunity = getValidValue(
    await updateSWUOpportunityStatus(
      connection,
      opportunity.id,
      SWUOpportunityStatus.EvaluationCodeChallenge,
      "",
      testAdminSession
    ),
    null
  );
  if (!codeChallengeOpportunity) {
    throw new Error("Unable to evaluate team questions");
  }

  const codeChallengeOpportunitySlim = pick(
    codeChallengeOpportunity,
    slimOpportunityProps.filter((p) => p !== "subscribed")
  );

  const challengeScore = 100;
  const scoreCodeChallengeResult = await adminAppAgent
    .put(proposalIdUrl)
    .send(adt("scoreCodeChallenge", challengeScore));

  expect(scoreCodeChallengeResult.status).toEqual(200);
  expect(scoreCodeChallengeResult.body).toEqual({
    ...resubmitResult.body,
    ...rescreenInToCodeChallengeResult.body,
    opportunity: {
      ...rescreenInToCodeChallengeResult.body.opportunity,
      status: SWUOpportunityStatus.EvaluationCodeChallenge,
      updatedBy: expect.objectContaining({ id: testAdmin.id }),
      updatedAt: expect.any(String)
    },
    history: [
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testAdmin.id }),
        type: adt("status", SWUProposalStatus.EvaluatedCodeChallenge)
      }),
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testAdmin.id }),
        type: adt("event", SWUProposalEvent.ChallengeScoreEntered)
      }),
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testAdmin.id }),
        type: adt("status", SWUProposalStatus.UnderReviewCodeChallenge)
      }),
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testAdmin.id }),
        type: adt("status", SWUProposalStatus.EvaluatedTeamQuestions)
      }),
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testAdmin.id }),
        type: adt("status", SWUProposalStatus.UnderReviewCodeChallenge)
      }),
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testAdmin.id }),
        type: adt("status", SWUProposalStatus.EvaluatedTeamQuestions)
      }),
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testAdmin.id }),
        type: adt("event", SWUProposalEvent.QuestionsScoreEntered)
      }),
      expect.objectContaining({
        createdBy: null,
        type: adt("status", SWUProposalStatus.UnderReviewTeamQuestions)
      }),
      ...resubmitResult.body.history
    ],
    challengeScore,
    status: SWUProposalStatus.EvaluatedCodeChallenge,
    updatedBy: expect.objectContaining({ id: testAdmin.id }),
    updatedAt: expect.any(String),
    createdAt: expect.any(String) // TODO: fix this after writing tests
  });

  const screenInToTeamScenarioResult = await adminAppAgent
    .put(proposalIdUrl)
    .send(adt("screenInToTeamScenario"));

  expect(screenInToTeamScenarioResult.status).toEqual(200);
  expect(screenInToTeamScenarioResult.body).toMatchObject({
    // Proposals are unanonymized at this point
    ...resubmitResult.body,
    ...scoreCodeChallengeResult.body,
    opportunity: {
      ...codeChallengeOpportunitySlim,
      createdAt: getISODateString(codeChallengeOpportunitySlim, "createdAt"),
      updatedAt: getISODateString(codeChallengeOpportunitySlim, "updatedAt"),
      proposalDeadline: getISODateString(
        codeChallengeOpportunitySlim,
        "proposalDeadline"
      )
    },
    history: [
      {
        createdBy: { id: testAdmin.id },
        type: adt("status", SWUProposalStatus.UnderReviewTeamScenario)
      },
      ...scoreCodeChallengeResult.body.history
    ],
    status: SWUProposalStatus.UnderReviewTeamScenario,
    updatedAt: expect.any(String),
    createdAt: expect.any(String) // TODO: fix this after writing tests
  });

  const screenOutFromTeamScenarioResult = await adminAppAgent
    .put(proposalIdUrl)
    .send(adt("screenOutFromTeamScenario"));

  expect(screenOutFromTeamScenarioResult.status).toEqual(200);
  expect(screenOutFromTeamScenarioResult.body).toEqual({
    ...screenInToTeamScenarioResult.body,
    status: SWUProposalStatus.EvaluatedCodeChallenge,
    history: [
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testAdmin.id }),
        type: adt("status", SWUProposalStatus.EvaluatedCodeChallenge)
      }),
      ...screenInToTeamScenarioResult.body.history
    ],
    updatedAt: expect.any(String),
    createdAt: expect.any(String) // TODO: fix this after writing tests
  });

  const rescreenInToTeamScenarioResult = await adminAppAgent
    .put(proposalIdUrl)
    .send(adt("screenInToTeamScenario"));

  await updateSWUOpportunityStatus(
    connection,
    opportunity.id,
    SWUOpportunityStatus.EvaluationTeamScenario,
    "",
    testAdminSession
  );

  const scenarioScore = 100;
  const scoreTeamScenarioResult = await adminAppAgent
    .put(proposalIdUrl)
    .send(adt("scoreTeamScenario", scenarioScore));

  expect(scoreTeamScenarioResult.status).toEqual(200);
  expect(scoreTeamScenarioResult.body).toEqual({
    ...rescreenInToTeamScenarioResult.body,
    opportunity: {
      ...rescreenInToTeamScenarioResult.body.opportunity,
      status: SWUOpportunityStatus.EvaluationTeamScenario,
      updatedAt: expect.any(String)
    },
    scenarioScore,
    totalScore: 100,
    priceScore: 100,
    rank: 1,
    status: SWUProposalStatus.EvaluatedTeamScenario,
    history: [
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testAdmin.id }),
        type: adt("status", SWUProposalStatus.EvaluatedTeamScenario)
      }),
      expect.objectContaining({
        createdBy: null,
        type: adt("event", SWUProposalEvent.PriceScoreEntered)
      }),
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testAdmin.id }),
        type: adt("event", SWUProposalEvent.ScenarioScoreEntered)
      }),
      ...rescreenInToTeamScenarioResult.body.history
    ],
    updatedAt: expect.any(String),
    createdAt: expect.any(String) // TODO: fix this after writing tests
  });

  const awardResult = await adminAppAgent.put(proposalIdUrl).send(adt("award"));

  expect(awardResult.status).toEqual(200);
  expect(awardResult.body).toEqual({
    ...scoreTeamScenarioResult.body,
    opportunity: {
      ...scoreTeamScenarioResult.body.opportunity,
      status: SWUOpportunityStatus.Awarded,
      updatedAt: expect.any(String)
    },
    status: SWUProposalStatus.Awarded,
    history: [
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testAdmin.id }),
        type: adt("status", SWUProposalStatus.Awarded)
      }),
      ...scoreTeamScenarioResult.body.history
    ],
    updatedAt: expect.any(String),
    createdAt: expect.any(String) // TODO: fix this after writing tests
  });

  const disqualificationReason = "testing";
  const disqualifyResult = await adminAppAgent
    .put(proposalIdUrl)
    .send(adt("disqualify", disqualificationReason));

  expect(disqualifyResult.status).toEqual(200);
  expect(disqualifyResult.body).toEqual({
    ...omit(awardResult.body, ["rank"]),
    status: SWUProposalStatus.Disqualified,
    history: [
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testAdmin.id }),
        note: disqualificationReason,
        type: adt("status", SWUProposalStatus.Disqualified)
      }),
      ...awardResult.body.history
    ],
    updatedAt: expect.any(String),
    createdAt: expect.any(String) // TODO: fix this after writing tests
  });
});
