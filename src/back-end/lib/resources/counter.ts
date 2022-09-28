import * as crud from "back-end/lib/crud";
import * as db from "back-end/lib/db";
import * as permissions from "back-end/lib/permissions";
import {
  basicResponse,
  JsonResponseBody,
  makeJsonResponseBody,
  nullRequestBodyHandler,
  wrapRespond
} from "back-end/lib/server";
import {
  UpdateRequestBody,
  UpdateValidationErrors
} from "shared/lib/resources/counter";
import { Session } from "shared/lib/resources/session";
import {
  getInvalidValue,
  invalid,
  isInvalid,
  isValid
} from "shared/lib/validation";
import {
  validateCounterName,
  validateCounterNames
} from "shared/lib/validation/counter";

type ValidatedUpdateRequestBody = string;

type Resource = crud.SimpleResource<
  Session,
  db.Connection,
  null,
  null,
  null,
  null,
  null,
  UpdateRequestBody,
  ValidatedUpdateRequestBody,
  UpdateValidationErrors
>;

const resource: Resource = {
  routeNamespace: "counters",

  readMany(connection) {
    return nullRequestBodyHandler<
      JsonResponseBody<Record<string, number> | string[]>,
      Session
    >(async (request) => {
      const respond = (code: number, body: Record<string, number> | string[]) =>
        basicResponse(code, request.session, makeJsonResponseBody(body));
      if (!permissions.readManyCounters(request.session)) {
        return respond(401, [permissions.ERROR_MESSAGE]);
      }

      const names = request.query.counters?.split(",") || [];
      const validatedCounterNames = validateCounterNames(names);
      if (isInvalid(validatedCounterNames)) {
        return respond(400, ["Invalid counter names provided"]);
      }

      if (
        validatedCounterNames.value.length === 0 &&
        !permissions.readAllCounters(request.session)
      ) {
        return respond(401, [permissions.ERROR_MESSAGE]);
      }

      const dbResult = await db.getCounters(
        connection,
        validatedCounterNames.value
      );
      if (isInvalid(dbResult)) {
        return respond(503, [db.ERROR_MESSAGE]);
      }

      return respond(200, dbResult.value);
    });
  },

  update(connection) {
    return {
      async parseRequestBody(request) {
        return null;
      },
      async validateRequestBody(request) {
        const validatedCounterName = validateCounterName(request.params.id);
        if (isValid(validatedCounterName)) {
          return validatedCounterName;
        } else {
          return invalid({
            name: getInvalidValue(validatedCounterName, undefined)
          });
        }
      },
      respond: wrapRespond({
        valid: async (request) => {
          const dbResult = await db.incrementCounters(connection, [
            request.body
          ]);
          if (isInvalid(dbResult) || !dbResult.value) {
            return basicResponse(
              503,
              request.session,
              makeJsonResponseBody({ database: [db.ERROR_MESSAGE] })
            );
          }
          return basicResponse(
            200,
            request.session,
            makeJsonResponseBody(dbResult.value)
          );
        },
        invalid: async (request) => {
          return basicResponse(
            400,
            request.session,
            makeJsonResponseBody(request.body)
          );
        }
      })
    };
  }
};

export default resource;
