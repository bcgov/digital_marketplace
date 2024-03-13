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
import { buildTWUOpportunity } from "tests/utils/generate/opportunities/team-with-us";
import {
  CreateRequestBody,
  TWUOpportunityEvent,
  TWUOpportunityStatus,
  TWUResource,
  TWUResourceQuestion
} from "shared/lib/resources/opportunity/team-with-us";
import { omit, pick } from "lodash";
import { getISODateString } from "shared/lib";
import { adt } from "shared/lib/types";
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

test("team-with-us opportunity crud", async () => {
  const {
    testUser,
    testUserSession,
    testAdmin,
    testAdminSession,
    userAppAgent,
    adminAppAgent
  } = await setup();

  // returns enum
  const opportunity = buildTWUOpportunity();
  const body: CreateRequestBody = {
    ...pick(opportunity, [
      "title",
      "teaser",
      "remoteOk",
      "remoteDesc",
      "location",
      "maxBudget",
      "description",
      "questionsWeight",
      "challengeWeight",
      "priceWeight"
    ]),
    proposalDeadline: getISODateString(opportunity, "proposalDeadline"),
    assignmentDate: getISODateString(opportunity, "assignmentDate"),
    startDate: getISODateString(opportunity, "startDate"),
    completionDate: getISODateString(opportunity, "completionDate"),
    maxBudget: opportunity.maxBudget,
    attachments: [],
    status: TWUOpportunityStatus.Draft,
    resourceQuestions: opportunity.resourceQuestions.map(
      ({ createdAt, createdBy, ...restOfQuestion }) => restOfQuestion
    ),
    resources: opportunity.resources.map((resource) => ({
      ...resource
    }))
  };

  const createRequest = userAppAgent
    .post("/api/opportunities/team-with-us")
    .send(body);

  const createResult = await requestWithCookie(createRequest, testUserSession);

  expect(createResult.status).toEqual(201);
  expect(createResult.body).toMatchObject({
    ...body,
    resources: [
      ...body.resources.map((resource) => ({
        ...resource,
        /**
         * We expect the value for resource.id to be different in the response
         * body (createResult.body) compared to the request (body) since
         * the function `createRequest` generates a new opportunityVersion which
         * updates the value of resource.id
         */
        id: createResult.body.resources[0].id
      }))
    ],
    createdBy: { id: testUser.id }
  });

  const opportunityId = createResult.body.id;
  const opportunityIdUrl = `/api/opportunities/team-with-us/${opportunityId}`;

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
      { type: { value: TWUOpportunityEvent.Edited } },
      ...readResult.body.history
    ],
    updatedAt: expect.any(String),
    resourceQuestions: [
      ...readResult.body.resourceQuestions.map(
        (question: TWUResourceQuestion) => ({
          ...question,
          createdAt: expect.any(String)
        })
      )
    ],
    resources: [
      ...readResult.body.resources.map((resource: TWUResource) => ({
        ...resource,
        /**
         * We expect the value for resource.id to be different in the response
         * body (editResult.body) compared to the previous response body
         * (readResult.body) since the function `editResult` generates a new
         * opportunityVersion which updates the value of resource.id
         */
        id: editResult.body.resources[0].id
      }))
    ]
  });

  const submitForReviewResult = await userAppAgent
    .put(opportunityIdUrl)
    .send(adt("submitForReview"));

  expect(submitForReviewResult.status).toEqual(200);
  expect(submitForReviewResult.body).toMatchObject({
    ...editResult.body,
    status: TWUOpportunityStatus.UnderReview,
    history: [
      { type: { value: TWUOpportunityStatus.UnderReview } },
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
    status: TWUOpportunityStatus.Published,
    history: [
      { type: { value: TWUOpportunityStatus.Published } },
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
      { type: { value: TWUOpportunityEvent.AddendumAdded } },
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
    status: TWUOpportunityStatus.Suspended,
    history: [
      { type: { value: TWUOpportunityStatus.Suspended } },
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
    status: TWUOpportunityStatus.Canceled,
    history: [
      { type: { value: TWUOpportunityStatus.Canceled } },
      ...suspendResult.body.history
    ],
    updatedAt: expect.any(String)
  });

  const createForDeleteResult = await userAppAgent
    .post("/api/opportunities/team-with-us")
    .send(body);
  const deleteOpportunityId = createForDeleteResult.body.id;

  const readManyBeforeDeleteResult = await userAppAgent.get(
    "/api/opportunities/team-with-us"
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
        "maxBudget",
        "location",
        "remoteOk",
        "subscribed"
      ])
    ])
  );

  const deleteResult = await userAppAgent.delete(
    `/api/opportunities/team-with-us/${deleteOpportunityId}`
  );

  expect(deleteResult.status).toBe(200);
  expect(deleteResult.body).toMatchObject({ id: deleteOpportunityId });

  const readManyAfterDeleteResult = await userAppAgent.get(
    "/api/opportunities/team-with-us"
  );

  expect(readManyAfterDeleteResult.body).toHaveLength(1);
  expect(readManyAfterDeleteResult.body).toMatchObject([{ id: opportunityId }]);
});
