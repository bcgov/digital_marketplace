import * as crud from "back-end/lib/crud";
import * as db from "back-end/lib/db";
import * as permissions from "back-end/lib/permissions";
import {
  basicResponse,
  JsonResponseBody,
  makeJsonResponseBody,
  nullRequestBodyHandler
} from "back-end/lib/server";
import { OrganizationSlim } from "shared/lib/resources/organization";
import { Session } from "shared/lib/resources/session";
import { isInvalid } from "shared/lib/validation";

const routeNamespace = "ownedOrganizations";

const readMany: crud.ReadMany<Session, db.Connection> = (
  connection: db.Connection
) => {
  return nullRequestBodyHandler<
    JsonResponseBody<OrganizationSlim[] | string[]>,
    Session
  >(async (request) => {
    const respond = (code: number, body: OrganizationSlim[] | string[]) =>
      basicResponse(code, request.session, makeJsonResponseBody(body));
    if (!permissions.readManyOwnedOrganizations) {
      return respond(401, [permissions.ERROR_MESSAGE]);
    }
    const dbResult = await db.readOwnedOrganizations(
      connection,
      request.session
    );
    if (isInvalid(dbResult)) {
      return respond(503, [db.ERROR_MESSAGE]);
    }
    return respond(200, dbResult.value);
  });
};

const resource: crud.BasicCrudResource<Session, db.Connection> = {
  routeNamespace,
  readMany
};

export default resource;
