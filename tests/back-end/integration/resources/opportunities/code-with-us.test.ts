import { buildCreateUserParams } from "tests/utils/generate/user";
import {
  insertUserWithActiveSession,
  requestWithCookie
} from "tests/back-end/integration/helpers/user";
import { connection } from "tests/back-end/setup-server.jest";
import { app } from "back-end/index";
import { agent } from "supertest";
import { omit, pick } from "lodash";
import { UserType } from "shared/lib/resources/user";
import {
  CWUOpportunityEvent,
  CWUOpportunityStatus,
  CreateRequestBody
} from "shared/lib/resources/opportunity/code-with-us";
import { buildCWUOpportunity } from "tests/utils/generate/opportunities/code-with-us";
import { getISODateString } from "shared/lib";
import { clearTestDatabase } from "tests/back-end/integration/helpers";
import { adt } from "shared/lib/types";

async function setup() {
  const [testUser, testSession] = await insertUserWithActiveSession(
    buildCreateUserParams({ type: UserType.Government }),
    connection
  );
  const appAgent = agent(app);
  return { testUser, testSession, appAgent };
}

afterEach(async () => {
  await clearTestDatabase(connection);
});

test("code-with-us opportunity crud", async () => {
  const { testUser, testSession, appAgent } = await setup();

  const opportunity = buildCWUOpportunity();
  const body: CreateRequestBody = {
    ...pick(opportunity, [
      "title",
      "teaser",
      "remoteOk",
      "remoteDesc",
      "location",
      "reward",
      "skills",
      "description",
      "submissionInfo",
      "acceptanceCriteria",
      "evaluationCriteria"
    ]),
    proposalDeadline: getISODateString(opportunity, "proposalDeadline"),
    assignmentDate: getISODateString(opportunity, "assignmentDate"),
    startDate: getISODateString(opportunity, "startDate"),
    completionDate: getISODateString(opportunity, "completionDate"),
    attachments: [],
    status: CWUOpportunityStatus.Draft
  };

  const createRequest = appAgent
    .post("/api/opportunities/code-with-us")
    .send(body);

  const createResult = await requestWithCookie(createRequest, testSession);

  expect(createResult.status).toEqual(201);
  expect(createResult.body).toMatchObject({
    ...body,
    createdBy: { id: testUser.id }
  });

  const opportunityId = createResult.body.id;
  const opportunityIdUrl = `/api/opportunities/code-with-us/${opportunityId}`;

  const readResult = await appAgent.get(opportunityIdUrl);
  expect(readResult.status).toEqual(200);
  expect(readResult.body).toEqual(createResult.body);

  const editedBody = { ...body, title: "Updated Title" };
  const editResult = await appAgent
    .put(opportunityIdUrl)
    .send(adt("edit", editedBody));

  expect(editResult.status).toEqual(200);
  expect(editResult.body).toMatchObject({
    ...readResult.body,
    title: editedBody.title,
    history: [
      { type: { value: CWUOpportunityEvent.Edited } },
      ...readResult.body.history
    ],
    updatedAt: expect.any(String),
    versionId: expect.any(String)
  });

  const publishResult = await appAgent
    .put(opportunityIdUrl)
    .send(adt("publish"));

  expect(publishResult.status).toEqual(200);
  expect(publishResult.body).toMatchObject({
    ...editResult.body,
    status: CWUOpportunityStatus.Published,
    history: [
      { type: { value: CWUOpportunityStatus.Published } },
      ...editResult.body.history
    ],
    updatedAt: expect.any(String)
  });

  const description = "New Addendum";
  const addAddendumResult = await appAgent
    .put(opportunityIdUrl)
    .send(adt("addAddendum", description));

  expect(addAddendumResult.status).toEqual(200);
  expect(addAddendumResult.body).toMatchObject({
    ...publishResult.body,
    addenda: [{ description }],
    history: [
      { type: { value: CWUOpportunityEvent.AddendumAdded } },
      ...publishResult.body.history
    ],
    updatedAt: expect.any(String)
  });

  const suspendResult = await appAgent
    .put(opportunityIdUrl)
    .send(adt("suspend"));

  expect(suspendResult.status).toBe(200);
  expect(suspendResult.body).toMatchObject({
    ...omit(addAddendumResult.body, ["reporting"]),
    status: CWUOpportunityStatus.Suspended,
    history: [
      { type: { value: CWUOpportunityStatus.Suspended } },
      ...addAddendumResult.body.history
    ],
    updatedAt: expect.any(String)
  });

  const cancelResult = await appAgent.put(opportunityIdUrl).send(adt("cancel"));

  expect(cancelResult.status).toBe(200);
  expect(cancelResult.body).toMatchObject({
    ...suspendResult.body,
    status: CWUOpportunityStatus.Canceled,
    history: [
      { type: { value: CWUOpportunityStatus.Canceled } },
      ...suspendResult.body.history
    ],
    updatedAt: expect.any(String)
  });

  const createForDeleteResult = await appAgent
    .post("/api/opportunities/code-with-us")
    .send(body);
  const deleteOpportunityId = createForDeleteResult.body.id;

  const readManyBeforeDeleteResult = await appAgent.get(
    "/api/opportunities/code-with-us"
  );
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
        "remoteOk",
        "reward",
        "location",
        "subscribed"
      ])
    ])
  );

  const deleteResult = await appAgent.delete(
    `/api/opportunities/code-with-us/${deleteOpportunityId}`
  );
  expect(deleteResult.status).toBe(200);
  expect(deleteResult.body).toMatchObject({ id: deleteOpportunityId });

  const readManyAfterDeleteResult = await appAgent.get(
    "/api/opportunities/code-with-us"
  );
  expect(readManyAfterDeleteResult.body).toHaveLength(1);
  expect(readManyAfterDeleteResult.body).toMatchObject([{ id: opportunityId }]);
}, 7000);
