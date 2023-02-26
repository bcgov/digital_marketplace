import { SessionRecord } from "shared/lib/resources/session";
import { User, UserStatus, UserType } from "shared/lib/resources/user";
import { connectToDatabase } from "back-end/index";
import { generateUuid } from "back-end/lib";
import {
  findOneUserByTypeAndUsername,
  RawUser,
  rawUserToUser
} from "back-end/lib/db";
import { KEYCLOAK_URL } from "back-end/config";
import { expect } from "chai";
import superagent from "superagent";
import request, { SuperTest, Test } from "supertest";

const govUsername = "usagop01";
const govPassword = "123Soleil!";
const adminUsername = "admin01";
const adminPassword = "123Soleil!";
const govClientId = "marketplace-idp";
const govClientSecret = "d62217e5-3171-4ba4-b715-18d07ec0ac89";

const vendor1Username = "vendor01";
const vendor1Password = "123Soleil!";
const vendorClientId = "marketplace-idp";
const vendorClientSecret = "20422e25-77a4-476a-8ddc-a3dc4a1a8747";

export type AgentWithCookie = SuperTest<Test>;

/**
 * Create a Superagent session with the given user logged in,
 *
 * @param realm The authentication realm
 * @param clientId The Keycloak Realm's client ID
 * @param clientSecret The Keycloak Realm's client password
 * @param username The username to use to log in
 * @param password The user's password
 * @returns The Superagent instance
 */
export const getLoggedAgent = async (
  realm: string,
  clientId: string,
  clientSecret: string,
  username: string,
  password: string
): Promise<SuperTest<Test>> => {
  const tokenUrl = `${KEYCLOAK_URL}/auth/realms/${realm}/protocol/openid-connect/token`;
  const authService = `/auth/service`;

  const body = {
    grant_type: "password",
    client_id: clientId,
    client_secret: clientSecret,
    username,
    password,
    scope: "openid profile email"
  };
  // const agent:AgentWithCookie = g.agent();
  const agent = request.agent();
  const externalAgent = superagent.agent();
  const response = await externalAgent
    .post(tokenUrl)
    .send(body)
    .set("Cache-Control", "no-cache")
    .set("Content-Type", "application/x-www-form-urlencoded");
  const authResponse = await agent
    .post(`${authService}?token=foobar`)
    .send(response.body);
  expect(authResponse).to.exist;
  await expect(response.status).to.eql(200);
  return agent;
};

/**
 * Create a Superagent session with the given government's user logged in,
 *
 * @param username The government's user username
 * @param password The government's user password
 * @returns he superagent instance
 */
export const getGovAgent = async (
  username: string = govUsername,
  password: string = govPassword
): Promise<AgentWithCookie> => {
  const clientId = govClientId;
  const clientSecret = govClientSecret;
  const realm = "idir";
  return getLoggedAgent(realm, clientId, clientSecret, username, password);
};

/**
 * Create a Superagent session with the government's admin logged in,
 *
 * @returns he superagent instance
 */
export const getAdminAgent = async (): Promise<AgentWithCookie> => {
  return getGovAgent(adminUsername, adminPassword);
};

/**
 * Create a Superagent session with the given vendor's user logged in,
 *
 * @param username The vendor's user username
 * @param password The vendor's user password
 * @returns he superagent instance
 */
export const getVendorAgent = async (
  username: string = vendor1Username,
  password: string = vendor1Password
): Promise<AgentWithCookie> => {
  const clientId = vendorClientId;
  const clientSecret = vendorClientSecret;
  const realm = "clicsequr";
  return getLoggedAgent(realm, clientId, clientSecret, username, password);
};

export const dbConnexion = connectToDatabase("");

const user = {
  acceptedTermsAt: new Date(),
  capabilities: [],
  deactivatedBy: null,
  deactivatedOn: null,
  email: null,
  idpId: "b",
  idpUsername: "a",
  jobTitle: "c",
  lastAcceptedTermsAt: null,
  //locale: 'fr',
  name: "d",
  notificationsOn: null,
  status: UserStatus.Active
};

const opUser = {
  ...user,
  id: generateUuid(),
  type: UserType.Government
};

const vendorUser = {
  ...user,
  id: generateUuid(),
  type: UserType.Vendor
};

/**
 * Creates a radnom user
 * @returns User The created user
 */
export async function createOpUser() {
  const now = new Date();
  const [result] = await dbConnexion<RawUser>("users").insert(
    {
      ...opUser,
      id: generateUuid(),
      createdAt: now,
      updatedAt: now
    } as any,
    "*"
  );
  return await rawUserToUser(dbConnexion, result);
}

export async function createVendorUser() {
  const now = new Date();
  const [result] = await dbConnexion<RawUser>("users").insert(
    {
      ...vendorUser,
      id: generateUuid(),
      createdAt: now,
      updatedAt: now
    } as any,
    "*"
  );
  return await rawUserToUser(dbConnexion, result);
}

export function createUserSession(user: User): SessionRecord {
  return {
    id: generateUuid(),
    createdAt: new Date(),
    updatedAt: new Date(),
    accessToken: generateUuid(),
    user
  };
}

export async function cleanupDatabase() {
  //await knexCleaner.clean(dbConnexion, {
  //ignoreTables: [DB_MIGRATIONS_TABLE_NAME]
  //});
}

export async function acceptTerms(username: string, agent: AgentWithCookie) {
  const dbConnexion = connectToDatabase("");
  const vendor = await findOneUserByTypeAndUsername(
    dbConnexion,
    UserType.Vendor,
    username
  );
  const vendorId = vendor.value?.id as string;

  return agent
    .put(`/api/users/${vendorId}`)
    .send({ tag: "acceptTerms" })
    .expect(200);
}
