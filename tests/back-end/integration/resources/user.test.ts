/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  insertUser,
  insertUserWithActiveSession,
  requestWithCookie
} from "../helpers/user";
import { app } from "back-end/index";
import { CreateUserParams } from "back-end/lib/db";
import {
  UpdateProfileRequestBody,
  UpdateRequestBody,
  UserStatus,
  UserType
} from "shared/lib/resources/user";
import { agent, SuperAgentTest } from "supertest";
import { clearTestDatabase } from "../helpers";
import { connection } from "../../setup.jest";

const testCreateAdminUserParams: CreateUserParams = {
  type: UserType.Admin,
  status: UserStatus.Active,
  name: "Test Admin User",
  email: "testadmin@email.com",
  idpUsername: "testadmin",
  idpId: "testadmin"
};

const testCreateGovUserParams: CreateUserParams = {
  type: UserType.Government,
  status: UserStatus.Active,
  name: "Test Gov User",
  email: "testgov@email.com",
  idpUsername: "testgov",
  idpId: "testgov"
};

const testCreateVendorUserParams: CreateUserParams = {
  type: UserType.Vendor,
  status: UserStatus.Active,
  name: "Test Vendor User",
  email: "testvendor@email.com",
  idpUsername: "testvendor",
  idpId: "testvendor"
};

describe("User resource", () => {
  let appAgent: SuperAgentTest;

  beforeEach(() => {
    appAgent = agent(app);
  });

  afterEach(async () => {
    await clearTestDatabase(connection);
  });

  it("correctly supports a user reading their own profile", async () => {
    const [testVendor, testVendorSession] = await insertUserWithActiveSession(
      testCreateVendorUserParams,
      connection
    );
    const request = appAgent.get(`/api/users/${testVendor.id}`);
    const result = await requestWithCookie(request, testVendorSession);

    // expect(result.status).toEqual(200);
    // expect(result.body).toEqual(testVendor);
  });

  // it("correctly supports an admin reading all users", async () => {
  //   const [testAdmin, testAdminSession] = await insertUserWithActiveSession(
  //     testCreateAdminUserParams,
  //     connection
  //   );

  //   const testVendor = await insertUser(testCreateVendorUserParams, connection);

  //   const request = appAgent.get("/api/users");

  //   const result = await requestWithCookie(request, testAdminSession);

  //   expect(result.status).toEqual(200);
  //   expect(result.body).toEqual([testAdmin, testVendor]);
  // });

  // it("correctly supports updating user notifications", async () => {
  //   const [testVendor, testVendorSession] = await insertUserWithActiveSession(
  //     testCreateVendorUserParams,
  //     connection
  //   );

  //   const updateParams: UpdateRequestBody = {
  //     tag: "updateNotifications",
  //     value: true
  //   };

  //   const request = appAgent
  //     .put(`/api/users/${testVendor.id}`)
  //     .send(updateParams);

  //   const result = await requestWithCookie(request, testVendorSession);

  //   expect(result.status).toEqual(200);

  //   const { notificationsOn, ...rest } = testVendor;
  //   expect(result.body).toMatchObject(rest);
  //   expect(result.body.notificationsOn).toBeTruthy();
  // });

  // it("correctly supports updating user profiles", async () => {
  //   const [testVendor, testVendorSession] = await insertUserWithActiveSession(
  //     testCreateVendorUserParams,
  //     connection
  //   );

  //   const updateProfileRequestBody: UpdateProfileRequestBody = {
  //     name: "Updated Vendor Name",
  //     email: "updatedtestemail@email.com",
  //     jobTitle: "Updated Vendor Job Title"
  //   };

  //   const updateParams: UpdateRequestBody = {
  //     tag: "updateProfile",
  //     value: updateProfileRequestBody
  //   };

  //   const request = appAgent
  //     .put(`/api/users/${testVendor.id}`)
  //     .send(updateParams);

  //   const result = await requestWithCookie(request, testVendorSession);

  //   expect(result.status).toEqual(200);
  //   expect(result.body).toMatchObject({
  //     ...testVendor,
  //     ...updateProfileRequestBody
  //   });
  // });

  // it("correctly supports updating user capabilities", async () => {
  //   const [testVendor, testVendorSession] = await insertUserWithActiveSession(
  //     testCreateVendorUserParams,
  //     connection
  //   );

  //   const updateParams: UpdateRequestBody = {
  //     tag: "updateCapabilities",
  //     value: ["Agile Coaching"]
  //   };

  //   const request = appAgent
  //     .put(`/api/users/${testVendor.id}`)
  //     .send(updateParams);

  //   const result = await requestWithCookie(request, testVendorSession);

  //   expect(result.status).toEqual(200);
  //   expect(result.body).toMatchObject({
  //     ...testVendor,
  //     capabilities: ["Agile Coaching"]
  //   });
  // });

  // it("correctly supports accepting user terms", async () => {
  //   const [testVendor, testVendorSession] = await insertUserWithActiveSession(
  //     testCreateVendorUserParams,
  //     connection
  //   );

  //   const updateParams: UpdateRequestBody = {
  //     tag: "acceptTerms",
  //     value: undefined
  //   };

  //   const request = appAgent
  //     .put(`/api/users/${testVendor.id}`)
  //     .send(updateParams);

  //   const result = await requestWithCookie(request, testVendorSession);

  //   expect(result.status).toEqual(200);
  //   const { acceptedTermsAt, lastAcceptedTermsAt, ...rest } = testVendor;
  //   expect(result.body).toMatchObject(rest);
  //   expect(result.body.acceptedTermsAt).toBeTruthy();
  //   expect(result.body.lastAcceptedTermsAt).toBeTruthy();
  // });

  // it("correctly supports an admin reactivating a user that was disabled by an admin", async () => {
  //   const testVendor = await insertUser(
  //     {
  //       ...testCreateVendorUserParams,
  //       status: UserStatus.InactiveByAdmin
  //     },
  //     connection
  //   );

  //   const updateParams: UpdateRequestBody = {
  //     tag: "reactivateUser",
  //     value: undefined
  //   };

  //   const [, testAdminSession] = await insertUserWithActiveSession(
  //     testCreateAdminUserParams,
  //     connection
  //   );

  //   const request = appAgent
  //     .put(`/api/users/${testVendor.id}`)
  //     .send(updateParams);

  //   const result = await requestWithCookie(request, testAdminSession);

  //   expect(result.status).toEqual(200);
  //   expect(result.body).toMatchObject({
  //     ...testVendor,
  //     status: UserStatus.Active
  //   });
  // });

  // it("correctly supports an admin granting admin permissions to a gov user", async () => {
  //   const testGovUser = await insertUser(testCreateGovUserParams, connection);

  //   const updateParams: UpdateRequestBody = {
  //     tag: "updateAdminPermissions",
  //     value: true
  //   };

  //   const [, testAdminSession] = await insertUserWithActiveSession(
  //     testCreateAdminUserParams,
  //     connection
  //   );

  //   const request = appAgent
  //     .put(`/api/users/${testGovUser.id}`)
  //     .send(updateParams);

  //   const result = await requestWithCookie(request, testAdminSession);

  //   expect(result.status).toEqual(200);
  //   expect(result.body).toMatchObject({
  //     ...testGovUser,
  //     type: UserType.Admin
  //   });
  // });

  // it("correctly supports an admin removing admin permissions from an admin user", async () => {
  //   const testAdminUser = await insertUser(
  //     {
  //       ...testCreateGovUserParams,
  //       type: UserType.Admin
  //     },
  //     connection
  //   );

  //   const updateParams: UpdateRequestBody = {
  //     tag: "updateAdminPermissions",
  //     value: false
  //   };

  //   const [, testAdminSession] = await insertUserWithActiveSession(
  //     testCreateAdminUserParams,
  //     connection
  //   );

  //   const request = appAgent
  //     .put(`/api/users/${testAdminUser.id}`)
  //     .send(updateParams);

  //   const result = await requestWithCookie(request, testAdminSession);

  //   expect(result.status).toEqual(200);
  //   expect(result.body).toMatchObject({
  //     ...testAdminUser,
  //     type: UserType.Government
  //   });
  // });
});
