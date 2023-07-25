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

  const opportunity = await insertSWUOpportunity(
    connection,
    buildCreateSWUOpportunityParams({
      status: SWUOpportunityStatus.Published,
      proposalDeadline: faker.date.soon()
    }),
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
    opportunity: opportunitySlim
  });
  proposal.teamQuestionResponses = proposal.teamQuestionResponses.slice(
    0,
    opportunity.teamQuestions.length
  );

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
  expect(submitResult.status).toEqual(200);
});
