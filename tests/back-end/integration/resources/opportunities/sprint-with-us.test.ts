import { app } from "back-end/index";
import { clearTestDatabase } from "tests/back-end/integration/helpers";
import {
  insertUserWithActiveSession,
  requestWithCookie
} from "tests/back-end/integration/helpers/user";
import { connection } from "tests/back-end/setup-server.jest";
import { UserType } from "shared/lib/resources/user";
import { agent } from "supertest";
import { buildCreateUserParams } from "tests/utils/generate/user";
import {
  buildSWUEvaluationPanelMember,
  buildSWUOpportunity
} from "tests/utils/generate/opportunities/sprint-with-us";
import {
  CreateRequestBody,
  SWUOpportunityEvent,
  SWUOpportunityPhaseRequiredCapability,
  SWUOpportunityStatus,
  SWUTeamQuestion
} from "shared/lib/resources/opportunity/sprint-with-us";
import { omit, pick } from "lodash";
import { getISODateString } from "shared/lib";
import { adt } from "shared/lib/types";
import { getEmail } from "tests/utils/generate";

async function setup() {
  const [testUser, testUserSession] = await insertUserWithActiveSession(
    buildCreateUserParams({ type: UserType.Government }),
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

test("sprint-with-us opportunity crud", async () => {
  const {
    testUser,
    testUserSession,
    testAdmin,
    testAdminSession,
    userAppAgent,
    adminAppAgent
  } = await setup();

  const opportunity = buildSWUOpportunity();
  const body: CreateRequestBody = {
    ...pick(opportunity, [
      "title",
      "teaser",
      "remoteOk",
      "remoteDesc",
      "location",
      "totalMaxBudget",
      "minTeamMembers",
      "mandatorySkills",
      "optionalSkills",
      "description",
      "questionsWeight",
      "codeChallengeWeight",
      "scenarioWeight",
      "priceWeight"
    ]),
    proposalDeadline: getISODateString(opportunity, "proposalDeadline"),
    assignmentDate: getISODateString(opportunity, "assignmentDate"),
    implementationPhase: {
      startDate: getISODateString(opportunity.implementationPhase, "startDate"),
      completionDate: getISODateString(
        opportunity.implementationPhase,
        "completionDate"
      ),
      maxBudget: opportunity.implementationPhase.maxBudget,
      requiredCapabilities:
        opportunity.implementationPhase.requiredCapabilities.map(
          ({ capability, fullTime }) => ({ capability, fullTime })
        )
    },
    attachments: [],
    status: SWUOpportunityStatus.Draft,
    teamQuestions: opportunity.teamQuestions.map(
      ({ createdAt, createdBy, ...restOfQuestion }) => restOfQuestion
    ),
    evaluationPanel: [
      {
        ...pick(
          buildSWUEvaluationPanelMember({
            user: testUser,
            chair: true,
            order: 0
          }),
          ["chair", "evaluator", "order"]
        ),
        email: testUser.email ?? getEmail()
      },
      {
        ...pick(
          buildSWUEvaluationPanelMember({
            user: testAdmin,
            order: 1
          }),
          ["chair", "evaluator", "order"]
        ),
        email: testAdmin.email ?? getEmail()
      }
    ]
  };

  const createRequest = userAppAgent
    .post("/api/opportunities/sprint-with-us")
    .send(body);

  const createResult = await requestWithCookie(createRequest, testUserSession);

  expect(createResult.status).toEqual(201);
  expect(createResult.body).toMatchObject({
    ...omit(body, ["minTeamMembers"]),
    // Express' res.json omits falsy values.
    ...(body.minTeamMembers ? { minTeamMembers: body.minTeamMembers } : {}),
    implementationPhase: {
      ...body.implementationPhase,
      // Capabilities may be out of order
      requiredCapabilities: expect.arrayContaining(
        body.implementationPhase.requiredCapabilities.map((capability) =>
          expect.objectContaining(capability)
        )
      )
    },
    evaluationPanel: [
      {
        ...omit(body.evaluationPanel[0], ["email"]),
        user: pick(testUser, ["id", "name", "avatarImageFile", "email"])
      },
      {
        ...omit(body.evaluationPanel[1], ["email"]),
        user: pick(testAdmin, ["id", "name", "avatarImageFile", "email"])
      }
    ],
    createdBy: { id: testUser.id }
  });

  const opportunityId = createResult.body.id;
  const opportunityIdUrl = `/api/opportunities/sprint-with-us/${opportunityId}`;

  const readResult = await userAppAgent.get(opportunityIdUrl);

  expect(readResult.status).toEqual(200);
  expect(readResult.body).toEqual(createResult.body);

  const editedBody = { ...body, title: "Updated Title" };
  const editResult = await userAppAgent
    .put(opportunityIdUrl)
    .send(adt("edit", editedBody));

  expect(editResult.status).toEqual(200);
  expect(editResult.body).toMatchObject({
    ...readResult.body,
    title: editedBody.title,
    history: [
      { type: { value: SWUOpportunityEvent.Edited } },
      ...readResult.body.history
    ],
    updatedAt: expect.any(String),
    implementationPhase: {
      ...readResult.body.implementationPhase,
      createdAt: expect.any(String),
      requiredCapabilities:
        readResult.body.implementationPhase.requiredCapabilities.map(
          (capability: SWUOpportunityPhaseRequiredCapability) => ({
            ...capability,
            createdAt: expect.any(String)
          })
        )
    },
    teamQuestions: [
      ...readResult.body.teamQuestions.map((question: SWUTeamQuestion) => ({
        ...question,
        createdAt: expect.any(String)
      }))
    ]
  });

  const submitForReviewResult = await userAppAgent
    .put(opportunityIdUrl)
    .send(adt("submitForReview"));

  expect(submitForReviewResult.status).toEqual(200);
  expect(submitForReviewResult.body).toMatchObject({
    ...editResult.body,
    status: SWUOpportunityStatus.UnderReview,
    history: [
      { type: { value: SWUOpportunityStatus.UnderReview } },
      ...editResult.body.history
    ],
    updatedAt: expect.any(String)
  });

  const publishRequest = adminAppAgent
    .put(opportunityIdUrl)
    .send(adt("publish"));

  const publishResult = await requestWithCookie(
    publishRequest,
    testAdminSession
  );

  expect(publishResult.status).toEqual(200);
  expect(publishResult.body).toMatchObject({
    ...submitForReviewResult.body,
    status: SWUOpportunityStatus.Published,
    history: [
      { type: { value: SWUOpportunityStatus.Published } },
      ...submitForReviewResult.body.history
    ],
    updatedAt: expect.any(String),
    updatedBy: {
      id: testAdmin.id
    }
  });

  const description = "New Addendum";
  const addAddendumResult = await adminAppAgent
    .put(opportunityIdUrl)
    .send(adt("addAddendum", description));

  expect(addAddendumResult.status).toEqual(200);
  expect(addAddendumResult.body).toMatchObject({
    ...publishResult.body,
    addenda: [{ description }],
    history: [
      { type: { value: SWUOpportunityEvent.AddendumAdded } },
      ...publishResult.body.history
    ],
    updatedAt: expect.any(String)
  });

  const suspendResult = await adminAppAgent
    .put(opportunityIdUrl)
    .send(adt("suspend"));

  expect(suspendResult.status).toBe(200);
  expect(suspendResult.body).toMatchObject({
    ...omit(addAddendumResult.body, ["reporting"]),
    status: SWUOpportunityStatus.Suspended,
    history: [
      { type: { value: SWUOpportunityStatus.Suspended } },
      ...addAddendumResult.body.history
    ],
    updatedAt: expect.any(String)
  });

  const cancelResult = await adminAppAgent
    .put(opportunityIdUrl)
    .send(adt("cancel"));

  expect(cancelResult.status).toBe(200);
  expect(cancelResult.body).toMatchObject({
    ...suspendResult.body,
    status: SWUOpportunityStatus.Canceled,
    history: [
      { type: { value: SWUOpportunityStatus.Canceled } },
      ...suspendResult.body.history
    ],
    updatedAt: expect.any(String)
  });

  const createForDeleteResult = await userAppAgent
    .post("/api/opportunities/sprint-with-us")
    .send(body);
  const deleteOpportunityId = createForDeleteResult.body.id;

  const readManyBeforeDeleteResult = await userAppAgent.get(
    "/api/opportunities/sprint-with-us"
  );

  expect(readManyBeforeDeleteResult.body).toHaveLength(2);
  expect(readManyBeforeDeleteResult.body).toMatchObject(
    expect.arrayContaining([
      expect.objectContaining({ id: opportunityId }),
      pick(createForDeleteResult.body, [
        "id",
        "title",
        "teaser",
        "createdAt",
        "createdBy",
        "updatedAt",
        "updatedBy",
        "status",
        "proposalDeadline",
        "totalMaxBudget",
        "location",
        "remoteOk",
        "subscribed"
      ])
    ])
  );

  const deleteResult = await userAppAgent.delete(
    `/api/opportunities/sprint-with-us/${deleteOpportunityId}`
  );

  expect(deleteResult.status).toBe(200);
  expect(deleteResult.body).toMatchObject({ id: deleteOpportunityId });

  const readManyAfterDeleteResult = await userAppAgent.get(
    "/api/opportunities/sprint-with-us"
  );

  expect(readManyAfterDeleteResult.body).toHaveLength(1);
  expect(readManyAfterDeleteResult.body).toMatchObject([{ id: opportunityId }]);
});
