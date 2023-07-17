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
  TWUResourceQuestion
} from "shared/lib/resources/opportunity/team-with-us";
import { pick } from "lodash";
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
  const { testUser, testUserSession, userAppAgent } = await setup();

  const opportunity = buildTWUOpportunity();
  const body: CreateRequestBody = {
    ...pick(opportunity, [
      "title",
      "teaser",
      "remoteOk",
      "remoteDesc",
      "location",
      "maxBudget",
      "targetAllocation",
      "mandatorySkills",
      "optionalSkills",
      "serviceArea",
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
    )
  };

  const createRequest = userAppAgent
    .post("/api/opportunities/team-with-us")
    .send(body);

  const createResult = await requestWithCookie(createRequest, testUserSession);

  expect(createResult.status).toEqual(201);
  expect(createResult.body).toMatchObject({
    ...body,
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
});
