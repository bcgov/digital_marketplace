import {
  TOTAL_AWARDED_COUNT_OFFSET,
  TOTAL_AWARDED_VALUE_OFFSET
} from "back-end/config";
import * as crud from "back-end/lib/crud";
import * as db from "back-end/lib/db";
import {
  basicResponse,
  JsonResponseBody,
  makeJsonResponseBody,
  nullRequestBodyHandler
} from "back-end/lib/server";
import {
  SupportedRequestBodies,
  SupportedResponseBodies
} from "back-end/lib/types";
import { OpportunityMetrics } from "shared/lib/resources/metrics";
import { Session } from "shared/lib/resources/session";
import { isInvalid } from "shared/lib/validation";

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
  db.Connection
>;

const resource: Resource = {
  routeNamespace: "metrics",

  readMany(connection) {
    return nullRequestBodyHandler<
      JsonResponseBody<OpportunityMetrics[] | string[]>,
      Session
    >(async (request) => {
      const respond = (code: number, body: OpportunityMetrics[] | string[]) =>
        basicResponse(code, request.session, makeJsonResponseBody(body));
      const dbResult = await db.readOpportunityMetrics(connection);
      if (isInvalid(dbResult)) {
        return respond(503, [db.ERROR_MESSAGE]);
      }
      // Add offsets
      dbResult.value.totalCount += TOTAL_AWARDED_COUNT_OFFSET;
      dbResult.value.totalAwarded += TOTAL_AWARDED_VALUE_OFFSET;
      return respond(200, [dbResult.value]);
    });
  }
};

export default resource;
