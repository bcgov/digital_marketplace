import {
  getRequestWithCookie,
  insertUserWithActiveSession
} from "../helpers/user";
import { app } from "back-end/index";
import { agent, SuperAgentTest } from "supertest";
import { CreateUserParams } from "back-end/lib/db";
import { generateUuid } from "back-end/lib";
import { UserStatus, UserType } from "shared/lib/resources/user";
import { clearTestDatabase } from "../helpers";

const testUserParams: CreateUserParams = {
  id: generateUuid(),
  type: UserType.Vendor,
  status: UserStatus.Active,
  name: "Test",
  email: "test@email.com",
  idpId: "test",
  idpUsername: "test"
};

describe("Vendor - Accept Terms", () => {
  let appAgent: SuperAgentTest;

  beforeAll(() => {
    appAgent = agent(app);
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  it("allows a vendor to accept the terms of service", async () => {
    const [user, session] = await insertUserWithActiveSession(testUserParams);
    const request = appAgent.put(`/api/users/${user?.id}`);

    const result = await getRequestWithCookie(request, session).send({
      tag: "acceptTerms"
    });

    expect(result.status).toBe(200);
  });
});
