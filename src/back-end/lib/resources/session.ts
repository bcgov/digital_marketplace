import {
  KEYCLOAK_CLIENT_ID,
  KEYCLOAK_CLIENT_SECRET,
  KEYCLOAK_REALM,
  KEYCLOAK_URL
} from "back-end/config";
import * as crud from "back-end/lib/crud";
import { Connection, deleteSession } from "back-end/lib/db";
import * as permissions from "back-end/lib/permissions";
import {
  basicResponse,
  makeJsonResponseBody,
  nullRequestBodyHandler
} from "back-end/lib/server";
import {
  SupportedRequestBodies,
  SupportedResponseBodies
} from "back-end/lib/types";
import qs from "querystring";
import { request as httpRequest } from "shared/lib/http";
import { Session } from "shared/lib/resources/session";
import { ClientHttpMethod } from "shared/lib/types";
import { invalid, valid, Validation } from "shared/lib/validation";

type Resource = crud.Resource<
  SupportedRequestBodies,
  SupportedResponseBodies,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  Session,
  Connection
>;

export async function signOut(
  connection: Connection,
  session: Session
): Promise<Validation<Session, string[]>> {
  if (!session) {
    return valid(session);
  }
  // Sign out of KeyCloak.
  const formData = qs.stringify({
    client_id: KEYCLOAK_CLIENT_ID,
    client_secret: KEYCLOAK_CLIENT_SECRET,
    scope: "openid",
    refresh_token: session.accessToken || ""
  });
  try {
    await httpRequest(
      ClientHttpMethod.Post,
      `${KEYCLOAK_URL}/auth/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout`,
      formData,
      { "Content-Type": "application/x-www-form-urlencoded" }
    );
  } catch (e) {
    return invalid(["KeyCloak sign-out request failed."]);
  }
  // Delete the current session
  await deleteSession(connection, session.id);
  return valid(session);
}

const resource: Resource = {
  routeNamespace: "sessions",

  readOne(connection) {
    return nullRequestBodyHandler(async (request) => {
      const respond = (code: number, body: Session | string[]) =>
        basicResponse(code, request.session, makeJsonResponseBody(body));
      if (!permissions.readOneSession(request.session, request.params.id)) {
        return respond(401, [permissions.ERROR_MESSAGE]);
      }
      return respond(200, request.session);
    });
  },

  delete(connection) {
    return nullRequestBodyHandler(async (request) => {
      const respond = (code: number, body: null | string[]) =>
        basicResponse(code, request.session, makeJsonResponseBody(body));
      if (!permissions.deleteSession(request.session, request.params.id)) {
        return respond(401, [permissions.ERROR_MESSAGE]);
      }
      const result = await signOut(connection, request.session);
      switch (result.tag) {
        case "valid":
          return respond(200, null);
        case "invalid":
          return respond(400, result.value);
      }
    });
  }
};

export default resource;
