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
import { buildSWUProposal } from "tests/utils/generate/proposals/sprint-with-us";
import { buildOrganization } from "tests/utils/generate/organization";
import { insertOrganization } from "tests/back-end/integration/helpers/organization";
import { omit, pick } from "lodash";
import { insertSWUOpportunity } from "tests/back-end/integration/helpers/opportunities/sprint-with-us";
import { buildCreateSWUOpportunityParams } from "tests/utils/generate/opportunities/sprint-with-us";
import {
  CreateRequestBody,
  SWUProposalStatus
} from "shared/lib/resources/proposal/sprint-with-us";
import { SWUOpportunityStatus } from "shared/lib/resources/opportunity/sprint-with-us";
import CAPABILITY_NAMES_ONLY from "shared/lib/data/capabilities";
import { fakerEN_CA as faker } from "@faker-js/faker";
import { getISODateString } from "shared/lib";

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
  const { testUser, testUserSession, testAdminSession, userAppAgent } =
    await setup();

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
  const opportunity = await insertSWUOpportunity(
    connection,
    buildCreateSWUOpportunityParams({ status: SWUOpportunityStatus.Published }),
    testAdminSession
  );
  const proposal = buildSWUProposal({
    createdBy: testUserSlim,
    organization,
    opportunity
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
      proposedCost: proposal.implementationPhase.proposedCost
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
      ...pick(opportunity, [
        "status",
        "createdAt",
        "updatedAt",
        "id",
        "title",
        "teaser",
        "remoteOk",
        "location",
        "totalMaxBudget",
        "proposalDeadline"
      ]),
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
});
