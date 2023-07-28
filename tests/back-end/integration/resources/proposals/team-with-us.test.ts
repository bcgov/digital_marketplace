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
  TWUProposalStatus
} from "shared/lib/resources/proposal/team-with-us";
import {
  TWUOpportunitySlim,
  TWUOpportunityStatus,
  TWUServiceArea
} from "shared/lib/resources/opportunity/team-with-us";
import CAPABILITY_NAMES_ONLY from "shared/lib/data/capabilities";
import { fakerEN_CA as faker } from "@faker-js/faker";
import { getISODateString } from "shared/lib";
import { arrayOfUnion } from "shared/lib/types";
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
  const { testUser, testUserSession, testAdminSession, userAppAgent } =
    await setup();

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
    team: proposal.team.map(({ member, hourlyRate }) => ({
      member: member.id,
      hourlyRate
    })),
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
}, 10000);
