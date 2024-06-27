import { app } from "back-end/index";
import { clearTestDatabase } from "tests/back-end/integration/helpers";
import {
  insertUserWithActiveSession,
  requestWithCookie
} from "tests/back-end/integration/helpers/user";
import { omit } from "lodash";
import { connection } from "tests/back-end/setup-server.jest";
import CAPABILITY_NAMES_ONLY from "shared/lib/data/capabilities";
import { CreateRequestBody } from "shared/lib/resources/organization";
import { UserType } from "shared/lib/resources/user";
import { agent } from "supertest";
import { buildOrganization } from "tests/utils/generate/organization";
import { buildCreateUserParams } from "tests/utils/generate/user";
import { adt } from "shared/lib/types";

async function setup() {
  const [testUser1, testUser1Session] = await insertUserWithActiveSession(
    buildCreateUserParams({
      type: UserType.Vendor,
      capabilities: CAPABILITY_NAMES_ONLY
    }),
    connection
  );
  const [testUser2, testUser2Session] = await insertUserWithActiveSession(
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

  if (!(testAdminSession && testUser1Session && testUser2Session)) {
    throw new Error("Failed to create test sessions");
  }

  const user1AppAgent = agent(app);
  const user2AppAgent = agent(app);
  const adminAppAgent = agent(app);
  return {
    testUser1,
    testUser2,
    testUser1Session,
    testUser2Session,
    testAdmin,
    testAdminSession,
    user1AppAgent,
    user2AppAgent,
    adminAppAgent
  };
}

afterEach(async () => {
  await clearTestDatabase(connection);
});

test("organization crud", async () => {
  const { testUser1Session, user1AppAgent } = await setup();

  const body: CreateRequestBody = omit(buildOrganization(), [
    "id",
    "createdAt",
    "updatedAt",
    "logoImageFile",
    "active",
    "owner",
    "acceptedSWUTerms",
    "acceptedTWUTerms",
    "possessAllCapabilities",
    "possessOneServiceArea",
    "numTeamMembers",
    "serviceAreas"
  ]);

  const createRequest = user1AppAgent.post("/api/organizations").send(body);

  const createResult = await requestWithCookie(createRequest, testUser1Session);

  expect(createResult.status).toEqual(201);
  expect(createResult.body).toMatchObject({
    ...body,
    contactEmail: body.contactEmail.toLowerCase()
  });

  const organizationId = createResult.body.id;
  const organizationIdUrl = `/api/organizations/${organizationId}`;

  const readResult = await user1AppAgent.get(organizationIdUrl);

  expect(readResult.status).toEqual(200);
  expect(readResult.body).toEqual(createResult.body);

  const editedBody = { ...body, legalName: "Updated Name" };
  const editResult = await user1AppAgent
    .put(organizationIdUrl)
    .send(adt("updateProfile", editedBody));

  expect(editResult.status).toEqual(200);
  expect(editResult.body).toMatchObject({
    ...readResult.body,
    legalName: editedBody.legalName,
    updatedAt: expect.any(String)
  });

  const acceptSWUTermsResult = await user1AppAgent
    .put(organizationIdUrl)
    .send(adt("acceptSWUTerms"));

  expect(acceptSWUTermsResult.status).toEqual(200);
  expect(acceptSWUTermsResult.body).toMatchObject({
    ...editResult.body,
    acceptedSWUTerms: expect.any(String),
    updatedAt: expect.any(String)
  });

  const acceptTWUTermsResult = await user1AppAgent
    .put(organizationIdUrl)
    .send(adt("acceptTWUTerms"));

  expect(acceptTWUTermsResult.status).toEqual(200);
  expect(acceptTWUTermsResult.body).toMatchObject({
    ...acceptSWUTermsResult.body,
    acceptedTWUTerms: expect.any(String),
    updatedAt: expect.any(String)
  });
});
