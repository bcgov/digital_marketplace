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
  buildCWUIndividualProponent,
  buildCWUProposal
} from "tests/utils/generate/proposals/code-with-us";
import { buildOrganization } from "tests/utils/generate/organization";
import { insertOrganization } from "tests/back-end/integration/helpers/organization";
import { omit, pick } from "lodash";
import { insertCWUOpportunity } from "tests/back-end/integration/helpers/opportunities/code-with-us";
import { buildCreateCWUOpportunityParams } from "tests/utils/generate/opportunities/code-with-us";
import {
  CreateRequestBody,
  CWUProposalEvent,
  CWUProposalStatus
} from "shared/lib/resources/proposal/code-with-us";
import {
  CWUOpportunitySlim,
  CWUOpportunityStatus
} from "shared/lib/resources/opportunity/code-with-us";
import { fakerEN_CA as faker } from "@faker-js/faker";
import { getISODateString } from "shared/lib";
import { adt, arrayOfUnion } from "shared/lib/types";
import { getPhoneNumber } from "tests/utils/generate";
import {
  updateCWUOpportunityVersion,
  closeCWUOpportunities
} from "back-end/lib/db";

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

  const createIndividualProponentBody: CreateRequestBody = {
    ...body,
    proponent: adt("individual", {
      ...omit(
        buildCWUIndividualProponent({
          legalName: testUser.name,
          ...(testUser.email ? { email: testUser.email } : {})
        }),
        ["id", "phone", "street2"]
      ),
      phone: getPhoneNumber(),
      street2: null
    })
  };
  const recreateResult = await userAppAgent
    .post("/api/proposals/code-with-us")
    .send(createIndividualProponentBody);

  expect(recreateResult.body).toMatchObject({
    proponent: createIndividualProponentBody.proponent
  });

  const proposalId = recreateResult.body.id;
  const proposalIdUrl = `/api/proposals/code-with-us/${proposalId}`;

  const readResult = await userAppAgent.get(proposalIdUrl);

  expect(readResult.status).toEqual(200);
  expect(readResult.body).toEqual(recreateResult.body);

  const additionalComments = "testing";
  const editedBody: CreateRequestBody = {
    ...createIndividualProponentBody,
    additionalComments
  };
  const editResult = await userAppAgent
    .put(proposalIdUrl)
    .send(adt("edit", editedBody));

  expect(editResult.status).toEqual(200);
  expect(editResult.body).toEqual({
    ...readResult.body,
    additionalComments,
    proponent: adt("individual", {
      ...readResult.body.proponent.value,
      updatedAt: expect.any(String)
    }),
    updatedAt: expect.any(String)
  });

  const submitResult = await userAppAgent
    .put(proposalIdUrl)
    .send(adt("submit"));

  expect(submitResult.status).toEqual(200);
  expect(submitResult.body).toEqual({
    ...editResult.body,
    status: CWUProposalStatus.Submitted,
    submittedAt: expect.any(String),
    updatedAt: expect.any(String),
    createdAt: expect.any(String) // TODO: fix this after writing tests
  });

  const withdrawResult = await userAppAgent
    .put(proposalIdUrl)
    .send(adt("withdraw"));

  expect(withdrawResult.status).toEqual(200);
  expect(withdrawResult.body).toEqual({
    ...submitResult.body,
    status: CWUProposalStatus.Withdrawn,
    updatedAt: expect.any(String),
    createdAt: expect.any(String) // TODO: fix this after writing tests
  });

  const resubmitResult = await userAppAgent
    .put(proposalIdUrl)
    .send(adt("submit"));

  // Close the opportunity
  const newDeadline = faker.date.recent();
  await updateCWUOpportunityVersion(
    connection,
    {
      ...omit(opportunityParams, ["status"]),
      id: opportunity.id,
      proposalDeadline: newDeadline
    },
    testAdminSession
  );
  await closeCWUOpportunities(connection);

  const score = 100;
  const scoreRequest = adminAppAgent
    .put(proposalIdUrl)
    .send(adt("score", score));
  const scoreResult = await requestWithCookie(scoreRequest, testAdminSession);

  expect(scoreResult.status).toEqual(200);
  expect(scoreResult.body).toEqual({
    ...resubmitResult.body,
    opportunity: {
      ...resubmitResult.body.opportunity,
      status: CWUOpportunityStatus.Evaluation,
      proposalDeadline: expect.any(String),
      updatedAt: expect.any(String),
      createdBy: expect.objectContaining({
        id: testAdmin.id
      })
    },
    status: CWUProposalStatus.Evaluated,
    score,
    rank: 1,
    history: [
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testAdmin.id }),
        type: adt("event", CWUProposalEvent.ScoreEntered)
      }),
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testAdmin.id }),
        type: adt("status", CWUProposalStatus.Evaluated)
      }),
      expect.objectContaining({
        createdBy: null,
        type: adt("status", CWUProposalStatus.UnderReview)
      }),
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testUser.id }),
        type: adt("status", CWUProposalStatus.Submitted)
      }),
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testUser.id }),
        type: adt("status", CWUProposalStatus.Withdrawn)
      }),
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testUser.id }),
        type: adt("status", CWUProposalStatus.Submitted)
      }),
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testUser.id }),
        type: adt("status", CWUProposalStatus.Draft)
      })
    ],
    updatedBy: expect.objectContaining({
      id: testAdmin.id
    }),
    updatedAt: expect.any(String),
    createdAt: expect.any(String) // TODO: fix this after writing tests
  });

  const awardResult = await adminAppAgent.put(proposalIdUrl).send(adt("award"));

  expect(awardResult.status).toEqual(200);
  expect(awardResult.body).toEqual({
    ...scoreResult.body,
    opportunity: {
      ...scoreResult.body.opportunity,
      status: CWUOpportunityStatus.Awarded,
      updatedBy: expect.objectContaining({
        id: testAdmin.id
      }),
      updatedAt: expect.any(String)
    },
    status: CWUProposalStatus.Awarded,
    // History is ordered by time
    // CWUProposalStatus.Evaluated and CWUProposalEvent.ScoreEntered occur at the same time
    history: expect.arrayContaining([
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testAdmin.id }),
        type: adt("status", CWUProposalStatus.Awarded)
      }),
      ...scoreResult.body.history
    ]),
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
    status: CWUProposalStatus.Disqualified,
    history: [
      expect.objectContaining({
        createdBy: expect.objectContaining({ id: testAdmin.id }),
        note: disqualificationReason,
        type: adt("status", CWUProposalStatus.Disqualified)
      }),
      ...awardResult.body.history
    ],
    updatedAt: expect.any(String),
    createdAt: expect.any(String) // TODO: fix this after writing tests
  });
});
