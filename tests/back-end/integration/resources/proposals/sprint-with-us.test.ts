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
import { adt } from "shared/lib/types";
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
  organization.numTeamMembers =
    organization.numTeamMembers && organization.numTeamMembers + 1;

  const opportunityParams = buildCreateSWUOpportunityParams({
    status: SWUOpportunityStatus.Published,
    proposalDeadline: faker.date.soon()
  });
  const opportunity = await insertSWUOpportunity(
    connection,
    opportunityParams,
    testAdminSession
  );
  const opportunitySlim: SWUOpportunitySlim = pick(opportunity, [
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

  const proposal = buildSWUProposal({
    createdBy: testUserSlim,
    organization,
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
  expect(createResult.status).toBe(201);
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
      ...pick(organization, [
        "id",
        "legalName",
        "owner",
        "acceptedTWUTerms",
        "acceptedSWUTerms",
        "possessAllCapabilities",
        "possessOneServiceArea",
        "active",
        "numTeamMembers",
        "serviceAreas"
      ]),
      acceptedSWUTerms: getISODateString(organization, "acceptedSWUTerms")
    },
    teamQuestionResponses: expect.arrayContaining(body.teamQuestionResponses)
  });

  const proposalId = createResult.body.id;
  const proposalIdUrl = `/api/proposals/sprint-with-us/${proposalId}`;

  const readResult = await userAppAgent.get(proposalIdUrl);

  expect(readResult.status).toEqual(200);
  expect(readResult.body).toEqual(createResult.body);

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
  expect(editResult.status).toBe(200);
  expect(editResult.body).toMatchObject({
    ...readResult.body,
    implementationPhase: {
      ...readResult.body.implementation,
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
  expect(submitResult.body).toMatchObject({
    ...editResult.body,
    status: SWUProposalStatus.Submitted,
    updatedAt: expect.any(String),
    createdAt: expect.any(String), // TODO: fix this after writing tests
    history: [
      {
        createdBy: { id: testUser.id },
        type: {
          value: SWUProposalStatus.Submitted
        }
      },
      ...editResult.body.history
    ]
  });

  const withdrawResult = await userAppAgent
    .put(proposalIdUrl)
    .send(adt("withdraw"));

  expect(withdrawResult.status).toEqual(200);
  expect(withdrawResult.body).toMatchObject({
    ...submitResult.body,
    status: SWUProposalStatus.Withdrawn,
    updatedAt: expect.any(String),
    createdAt: expect.any(String), // TODO: fix this after writing tests
    history: [
      {
        createdBy: { id: testUser.id },
        type: {
          value: SWUProposalStatus.Withdrawn
        }
      },
      ...submitResult.body.history
    ]
  });

  const resubmitResult = await userAppAgent
    .put(proposalIdUrl)
    .send(adt("submit"));

  expect(resubmitResult.status).toEqual(200);

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

  const scoreBody: UpdateTeamQuestionScoreBody[] =
    opportunity.teamQuestions.map(({ score, order }) => ({ score, order }));
  const scoreQuestionsRequest = adminAppAgent
    .put(proposalIdUrl)
    .send(adt("scoreQuestions", scoreBody));
  const scoreQuestionsResult = await requestWithCookie(
    scoreQuestionsRequest,
    testAdminSession
  );

  expect(scoreQuestionsResult.status).toEqual(200);
  expect(scoreQuestionsResult.body).toMatchObject({
    id: resubmitResult.body.id,
    submittedAt: resubmitResult.body.submittedAt,
    opportunity: {
      ...resubmitResult.body.opportunity,
      proposalDeadline: newDeadline.toISOString(),
      status: SWUOpportunityStatus.EvaluationTeamQuestions,
      updatedAt: expect.any(String)
    },
    questionsScore: 100,
    anonymousProponentName: "Proponent 1",
    updatedAt: expect.any(String),
    createdAt: expect.any(String) // TODO: fix this after writing tests
  });

  const screenInToCodeChallengeResult = await adminAppAgent
    .put(proposalIdUrl)
    .send(adt("screenInToCodeChallenge"));

  expect(screenInToCodeChallengeResult.status).toEqual(200);
  expect(screenInToCodeChallengeResult.body).toMatchObject({
    ...scoreQuestionsResult.body,
    status: SWUProposalStatus.UnderReviewCodeChallenge,
    updatedAt: expect.any(String),
    createdAt: expect.any(String) // TODO: fix this after writing tests
  });

  const screenOutFromCodeChallengeResult = await adminAppAgent
    .put(proposalIdUrl)
    .send(adt("screenOutFromCodeChallenge"));

  expect(screenOutFromCodeChallengeResult.status).toEqual(200);
  expect(screenOutFromCodeChallengeResult.body).toMatchObject({
    ...screenInToCodeChallengeResult.body,
    status: SWUProposalStatus.EvaluatedTeamQuestions,
    updatedAt: expect.any(String),
    createdAt: expect.any(String) // TODO: fix this after writing tests
  });

  await adminAppAgent.put(proposalIdUrl).send(adt("screenInToCodeChallenge"));

  await updateSWUOpportunityStatus(
    connection,
    opportunity.id,
    SWUOpportunityStatus.EvaluationCodeChallenge,
    "",
    testAdminSession
  );
});
