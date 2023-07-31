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
  buildTWUProposal,
  buildTWUProposalResourceQuestionResponse,
  buildTWUProposalTeamMember
} from "tests/utils/generate/proposals/team-with-us";
import { buildOrganization } from "tests/utils/generate/organization";
import { insertOrganization } from "tests/back-end/integration/helpers/organization";
import { omit, pick } from "lodash";
import { insertTWUOpportunity } from "tests/back-end/integration/helpers/opportunities/team-with-us";
import { buildCreateTWUOpportunityParams } from "tests/utils/generate/opportunities/team-with-us";
import {
  CreateRequestBody,
  TWUProposalEvent,
  TWUProposalStatus,
  UpdateResourceQuestionScoreBody
} from "shared/lib/resources/proposal/team-with-us";
import {
  TWUOpportunitySlim,
  TWUOpportunityStatus,
  TWUServiceArea
} from "shared/lib/resources/opportunity/team-with-us";
import CAPABILITY_NAMES_ONLY from "shared/lib/data/capabilities";
import { fakerEN_CA as faker } from "@faker-js/faker";
import { getISODateString } from "shared/lib";
import { adt, arrayOfUnion } from "shared/lib/types";
import {
  closeTWUOpportunities,
  updateTWUOpportunityStatus,
  updateTWUOpportunityVersion
} from "back-end/lib/db/opportunity/team-with-us";
import { getValidValue } from "shared/lib/validation";
import { validateServiceArea } from "back-end/lib/validation";
import { qualifyOrganizationServiceAreas } from "back-end/lib/db";
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

test("team-with-us proposal crud", async () => {
  const {
    testUser,
    testUserSession,
    testAdmin,
    testAdminSession,
    userAppAgent,
    adminAppAgent
  } = await setup();

  const serviceAreaId = getValidValue(
    await validateServiceArea(connection, TWUServiceArea.FullStackDeveloper),
    null
  );
  if (!serviceAreaId) {
    throw new Error("Failed to fetch service area id");
  }

  const testUserSlim = buildUserSlim(testUser);
  const organization = await insertOrganization(
    connection,
    testUser.id,
    omit(
      buildOrganization({
        owner: testUserSlim,
        acceptedTWUTerms: faker.date.past()
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

  const qualifiedOrganization = getValidValue(
    await qualifyOrganizationServiceAreas(
      connection,
      organization.id,
      [serviceAreaId],
      testAdminSession
    ),
    null
  );
  if (!qualifiedOrganization) {
    throw new Error("Failed to qualify organization service area");
  }
  const { logoImageFile, ...qualifiedOrganizationSlim } = pick(
    qualifiedOrganization,
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
      "active"
    ])
  );

  const opportunityParams = buildCreateTWUOpportunityParams({
    status: TWUOpportunityStatus.Published,
    proposalDeadline: faker.date.soon(),
    serviceArea: serviceAreaId
  });
  const opportunity = await insertTWUOpportunity(
    connection,
    opportunityParams,
    testAdminSession
  );
  const slimOpportunityProps = arrayOfUnion<keyof TWUOpportunitySlim>()([
    "id",
    "title",
    "teaser",
    "createdAt",
    "createdBy",
    "updatedAt",
    "updatedBy",
    "status",
    "proposalDeadline",
    "maxBudget",
    "location",
    "remoteOk",
    "subscribed"
  ]);
  const opportunitySlim: TWUOpportunitySlim = pick(
    opportunity,
    slimOpportunityProps
  );

  const proposal = buildTWUProposal({
    createdBy: testUserSlim,
    organization,
    opportunity: opportunitySlim,
    resourceQuestionResponses: opportunity.resourceQuestions.map(
      ({ order, wordLimit }) =>
        buildTWUProposalResourceQuestionResponse({
          order,
          response: faker.lorem.words({ min: 1, max: wordLimit })
        })
    ),
    team: [
      buildTWUProposalTeamMember({
        member: testUserSlim,
        idpUsername: testUser.idpUsername
      })
    ]
  });

  const body: CreateRequestBody = {
    opportunity: opportunity.id,
    organization: organization.id,
    attachments: [],
    resourceQuestionResponses: proposal.resourceQuestionResponses,
    team:
      proposal.team?.map(({ member, hourlyRate }) => ({
        member: member.id,
        hourlyRate
      })) ?? [],
    status: TWUProposalStatus.Draft
  };
  const createRequest = userAppAgent
    .post("/api/proposals/team-with-us")
    .send(body);

  const createResult = await requestWithCookie(createRequest, testUserSession);
  expect(createResult.status).toEqual(201);
  expect(createResult.body).toMatchObject({
    ...body,
    team: proposal.team,
    opportunity: {
      ...omit(opportunitySlim, ["createdBy", "updatedBy", "subscribed"]),
      createdAt: getISODateString(opportunity, "createdAt"),
      updatedAt: getISODateString(opportunity, "updatedAt"),
      proposalDeadline: getISODateString(opportunity, "proposalDeadline")
    },
    organization: {
      ...qualifiedOrganizationSlim,
      acceptedTWUTerms: getISODateString(organization, "acceptedTWUTerms")
    },
    resourceQuestionResponses: expect.arrayContaining(
      body.resourceQuestionResponses
    ),
    createdBy: { id: testUser.id }
  });

  const deleteProposalId = createResult.body.id;
  const deleteProposalIdUrl = `/api/proposals/team-with-us/${deleteProposalId}`;

  const readManyBeforeDeleteResult = await userAppAgent.get(
    "/api/proposals/team-with-us"
  );

  expect(readManyBeforeDeleteResult.status).toEqual(200);
  expect(readManyBeforeDeleteResult.body).toHaveLength(1);
  expect(readManyBeforeDeleteResult.body).toEqual([
    omit(createResult.body, [
      "history",
      "attachments",
      "resourceQuestionResponses",
      "team"
    ])
  ]);

  const deleteResult = await userAppAgent.delete(deleteProposalIdUrl);

  expect(deleteResult.status).toEqual(200);
  expect(deleteResult.body).toEqual(createResult.body);

  const readManyAfterDeleteResult = await userAppAgent.get(
    "/api/proposals/team-with-us"
  );

  expect(readManyAfterDeleteResult.body).toHaveLength(0);

  const recreateResult = await userAppAgent
    .post("/api/proposals/team-with-us")
    .send(body);

  const proposalId = recreateResult.body.id;
  const proposalIdUrl = `/api/proposals/team-with-us/${proposalId}`;

  const readResult = await userAppAgent.get(proposalIdUrl);

  expect(readResult.status).toEqual(200);
  expect(readResult.body).toEqual(recreateResult.body);

  const editedBody = {
    ...body,
    team: body.team.map((member) => ({
      ...member,
      hourlyRate: member.hourlyRate + 1
    }))
  };
  const editResult = await userAppAgent
    .put(proposalIdUrl)
    .send(adt("edit", editedBody));

  expect(editResult.status).toEqual(200);
  expect(editResult.body).toEqual({
    ...readResult.body,
    team:
      proposal.team?.map((member) => ({
        ...member,
        hourlyRate: editedBody.team.find(
          (editedMember) => editedMember.member === member.member.id
        )?.hourlyRate
      })) ?? [],
    resourceQuestionResponses: expect.arrayContaining(
      readResult.body.resourceQuestionResponses
    ),
    updatedAt: expect.any(String)
  });

  const submitResult = await userAppAgent
    .put(proposalIdUrl)
    .send(adt("submit"));

  expect(submitResult.status).toEqual(200);
  expect(submitResult.body).toEqual({
    ...editResult.body,
    status: TWUProposalStatus.Submitted,
    submittedAt: expect.any(String),
    history: [
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testUser.id }),
        type: expect.objectContaining({
          value: TWUProposalStatus.Submitted
        })
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
    status: TWUProposalStatus.Withdrawn,
    history: [
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testUser.id }),
        type: expect.objectContaining({
          value: TWUProposalStatus.Withdrawn
        })
      }),
      ...submitResult.body.history
    ],
    updatedAt: expect.any(String),
    createdAt: expect.any(String) // TODO: fix this after writing tests
  });

  const resubmitResult = await userAppAgent
    .put(proposalIdUrl)
    .send(adt("submit"));

  // Close the opportunity
  const newDeadline = faker.date.recent();
  await updateTWUOpportunityVersion(
    connection,
    {
      ...omit(opportunityParams, ["status"]),
      id: opportunity.id,
      proposalDeadline: newDeadline
    },
    testAdminSession
  );
  await closeTWUOpportunities(connection);

  const scoreQuestionsBody: UpdateResourceQuestionScoreBody[] =
    opportunity.resourceQuestions.map(({ score, order }) => ({ score, order }));
  const scoreQuestionsRequest = adminAppAgent
    .put(proposalIdUrl)
    .send(adt("scoreQuestions", scoreQuestionsBody));
  const scoreQuestionsResult = await requestWithCookie(
    scoreQuestionsRequest,
    testAdminSession
  );

  expect(scoreQuestionsResult.status).toEqual(200);
  expect(scoreQuestionsResult.body).toEqual({
    // Proposals are anonymized prior to resource challenge evaluation
    id: resubmitResult.body.id,
    submittedAt: resubmitResult.body.submittedAt,
    opportunity: {
      ...resubmitResult.body.opportunity,
      proposalDeadline: newDeadline.toISOString(),
      status: TWUOpportunityStatus.EvaluationResourceQuestions,
      updatedAt: expect.any(String),
      createdBy: expect.objectContaining({ id: testAdmin.id })
    },
    status: TWUProposalStatus.EvaluatedResourceQuestions,
    resourceQuestionResponses: expect.arrayContaining(
      proposal.resourceQuestionResponses.map((qr) => ({
        ...qr,
        score: scoreQuestionsBody.find(({ order }) => order === qr.order)?.score
      }))
    ),
    questionsScore: 100,
    anonymousProponentName: "Proponent 1",
    updatedAt: expect.any(String),
    createdAt: expect.any(String) // TODO: fix this after writing tests
  });

  const screenInToChallengeResult = await adminAppAgent
    .put(proposalIdUrl)
    .send(adt("screenInToChallenge"));

  expect(screenInToChallengeResult.status).toEqual(200);
  expect(screenInToChallengeResult.body).toEqual({
    ...scoreQuestionsResult.body,
    status: TWUProposalStatus.UnderReviewChallenge,
    updatedAt: expect.any(String),
    createdAt: expect.any(String) // TODO: fix this after writing tests
  });

  const screenOutFromChallengeResult = await adminAppAgent
    .put(proposalIdUrl)
    .send(adt("screenOutFromChallenge"));

  expect(screenOutFromChallengeResult.status).toEqual(200);
  expect(screenOutFromChallengeResult.body).toEqual({
    ...screenInToChallengeResult.body,
    status: TWUProposalStatus.EvaluatedResourceQuestions,
    updatedAt: expect.any(String),
    createdAt: expect.any(String) // TODO: fix this after writing tests
  });

  const rescreenInToChallengeResult = await adminAppAgent
    .put(proposalIdUrl)
    .send(adt("screenInToChallenge"));

  await updateTWUOpportunityStatus(
    connection,
    opportunity.id,
    TWUOpportunityStatus.EvaluationChallenge,
    "",
    testAdminSession
  ),
    null;

  const challengeScore = 100;
  const scoreChallengeResult = await adminAppAgent
    .put(proposalIdUrl)
    .send(adt("scoreChallenge", challengeScore));

  expect(scoreChallengeResult.status).toEqual(200);
  expect(scoreChallengeResult.body).toEqual({
    ...resubmitResult.body,
    ...rescreenInToChallengeResult.body,
    opportunity: {
      ...rescreenInToChallengeResult.body.opportunity,
      status: TWUOpportunityStatus.EvaluationChallenge,
      updatedBy: expect.objectContaining({ id: testAdmin.id }),
      updatedAt: expect.any(String)
    },
    challengeScore,
    totalScore: 100,
    priceScore: 100,
    rank: 1,
    status: TWUProposalStatus.EvaluatedChallenge,
    updatedBy: expect.objectContaining({ id: testAdmin.id }),
    history: [
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testAdmin.id }),
        type: expect.objectContaining({
          value: TWUProposalStatus.EvaluatedChallenge
        })
      }),
      expect.objectContaining({
        createdBy: null,
        type: expect.objectContaining({
          value: TWUProposalEvent.PriceScoreEntered
        })
      }),
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testAdmin.id }),
        type: expect.objectContaining({
          value: TWUProposalEvent.ChallengeScoreEntered
        })
      }),
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testAdmin.id }),
        type: expect.objectContaining({
          value: TWUProposalStatus.UnderReviewChallenge
        })
      }),
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testAdmin.id }),
        type: expect.objectContaining({
          value: TWUProposalStatus.EvaluatedResourceQuestions
        })
      }),
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testAdmin.id }),
        type: expect.objectContaining({
          value: TWUProposalStatus.UnderReviewChallenge
        })
      }),
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testAdmin.id }),
        type: expect.objectContaining({
          value: TWUProposalStatus.EvaluatedResourceQuestions
        })
      }),
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testAdmin.id }),
        type: expect.objectContaining({
          value: TWUProposalEvent.QuestionsScoreEntered
        })
      }),
      expect.objectContaining({
        createdBy: null,
        type: expect.objectContaining({
          value: TWUProposalStatus.UnderReviewResourceQuestions
        })
      }),
      ...resubmitResult.body.history
    ],
    updatedAt: expect.any(String),
    createdAt: expect.any(String) // TODO: fix this after writing tests
  });

  const awardResult = await adminAppAgent.put(proposalIdUrl).send(adt("award"));

  expect(awardResult.status).toEqual(200);
  expect(awardResult.body).toEqual({
    ...scoreChallengeResult.body,
    opportunity: {
      ...scoreChallengeResult.body.opportunity,
      status: TWUOpportunityStatus.Awarded,
      updatedAt: expect.any(String)
    },
    status: TWUProposalStatus.Awarded,
    history: [
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testAdmin.id }),
        type: expect.objectContaining({
          value: TWUProposalStatus.Awarded
        })
      }),
      ...scoreChallengeResult.body.history
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
    status: TWUProposalStatus.Disqualified,
    history: [
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testAdmin.id }),
        note: disqualificationReason,
        type: expect.objectContaining({
          value: TWUProposalStatus.Disqualified
        })
      }),
      ...awardResult.body.history
    ],
    updatedAt: expect.any(String),
    createdAt: expect.any(String) // TODO: fix this after writing tests
  });
});
