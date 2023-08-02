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
import { buildCWUProposal } from "tests/utils/generate/proposals/code-with-us";
import { buildOrganization } from "tests/utils/generate/organization";
import { insertOrganization } from "tests/back-end/integration/helpers/organization";
import { omit, pick } from "lodash";
import { insertCWUOpportunity } from "tests/back-end/integration/helpers/opportunities/code-with-us";
import { buildCreateCWUOpportunityParams } from "tests/utils/generate/opportunities/code-with-us";
import {
  CreateRequestBody,
  CWUProposalStatus
} from "shared/lib/resources/proposal/code-with-us";
import {
  CWUOpportunitySlim,
  CWUOpportunityStatus
} from "shared/lib/resources/opportunity/code-with-us";
import { fakerEN_CA as faker } from "@faker-js/faker";
import { getISODateString } from "shared/lib";
import { adt, arrayOfUnion } from "shared/lib/types";

async function setup() {
  const [testUser, testUserSession] = await insertUserWithActiveSession(
    buildCreateUserParams({
      type: UserType.Vendor
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

test("code-with-us proposal crud", async () => {
  const { testUser, testUserSession, testAdminSession, userAppAgent } =
    await setup();

  const testUserSlim = buildUserSlim(testUser);
  const organization = await insertOrganization(
    connection,
    testUser.id,
    omit(
      buildOrganization({
        owner: testUserSlim
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

  const opportunityParams = buildCreateCWUOpportunityParams({
    status: CWUOpportunityStatus.Published,
    proposalDeadline: faker.date.soon()
  });
  const opportunity = await insertCWUOpportunity(
    connection,
    opportunityParams,
    testAdminSession
  );
  const slimOpportunityProps = arrayOfUnion<keyof CWUOpportunitySlim>()([
    "id",
    "title",
    "teaser",
    "createdAt",
    "createdBy",
    "updatedAt",
    "updatedBy",
    "status",
    "proposalDeadline",
    "remoteOk",
    "reward",
    "location",
    "subscribed"
  ]);
  const opportunitySlim: CWUOpportunitySlim = pick(
    opportunity,
    slimOpportunityProps
  );

  const proposal = buildCWUProposal({
    createdBy: testUserSlim,
    proponent: adt("organization", organization),
    opportunity: opportunitySlim
  });

  const body: CreateRequestBody = {
    opportunity: opportunity.id,
    proposalText: proposal.proposalText,
    additionalComments: proposal.additionalComments,
    proponent: adt("organization", organization.id),
    attachments: [],
    status: CWUProposalStatus.Draft
  };
  const createRequest = userAppAgent
    .post("/api/proposals/code-with-us")
    .send(body);

  const createResult = await requestWithCookie(createRequest, testUserSession);
  expect(createResult.status).toEqual(201);
  expect(createResult.body).toMatchObject({
    ...body,
    opportunity: {
      ...omit(opportunitySlim, ["createdBy", "updatedBy", "subscribed"]),
      createdAt: getISODateString(opportunity, "createdAt"),
      updatedAt: getISODateString(opportunity, "updatedAt"),
      proposalDeadline: getISODateString(opportunity, "proposalDeadline")
    },
    proponent: adt("organization", {
      ...omit(organization, [
        "acceptedSWUTerms",
        "acceptedTWUTerms",
        "logoImageFile",
        "numTeamMembers",
        "owner",
        "possessAllCapabilities",
        "possessOneServiceArea"
      ]),
      createdAt: expect.any(String),
      updatedAt: expect.any(String)
    }),
    createdBy: { id: testUser.id }
  });

  const deleteProposalId = createResult.body.id;
  const deleteProposalIdUrl = `/api/proposals/code-with-us/${deleteProposalId}`;

  const readManyBeforeDeleteResult = await userAppAgent.get(
    "/api/proposals/code-with-us"
  );

  expect(readManyBeforeDeleteResult.status).toEqual(200);
  expect(readManyBeforeDeleteResult.body).toHaveLength(1);
  expect(readManyBeforeDeleteResult.body).toEqual([
    omit(createResult.body, [
      "proposalText",
      "additionalComments",
      "history",
      "attachments"
    ])
  ]);

  const deleteResult = await userAppAgent.delete(deleteProposalIdUrl);

  expect(deleteResult.status).toEqual(200);
  expect(deleteResult.body).toEqual(createResult.body);

  const readManyAfterDeleteResult = await userAppAgent.get(
    "/api/proposals/code-with-us"
  );

  expect(readManyAfterDeleteResult.body).toHaveLength(0);
});
