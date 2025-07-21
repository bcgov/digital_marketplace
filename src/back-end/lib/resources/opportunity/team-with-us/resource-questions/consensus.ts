import * as crud from "back-end/lib/crud";
import * as db from "back-end/lib/db";
import * as permissions from "back-end/lib/permissions";
import {
  JsonResponseBody,
  basicResponse,
  makeJsonResponseBody,
  nullRequestBodyHandler
} from "back-end/lib/server";
import { validateTWUOpportunityId } from "back-end/lib/validation";
import { TWUResourceQuestionResponseEvaluation } from "shared/lib/resources/evaluations/team-with-us/resource-questions";
import { Session } from "shared/lib/resources/session";
import { isInvalid } from "shared/lib/validation";

const routeNamespace =
  "opportunity/team-with-us/:opportunityId/resource-questions/consensus";

const readMany: crud.ReadMany<Session, db.Connection> = (
  connection: db.Connection
) => {
  return nullRequestBodyHandler<
    JsonResponseBody<TWUResourceQuestionResponseEvaluation[] | string[]>,
    Session
  >(async (request) => {
    const respond = (
      code: number,
      body: TWUResourceQuestionResponseEvaluation[] | string[]
    ) => basicResponse(code, request.session, makeJsonResponseBody(body));
    if (!permissions.isSignedIn(request.session)) {
      return respond(401, [permissions.ERROR_MESSAGE]);
    }

    const validatedTWUOpportunity = await validateTWUOpportunityId(
      connection,
      request.params.opportunityId,
      request.session
    );
    if (isInvalid(validatedTWUOpportunity)) {
      return respond(404, ["Team With Us opportunity not found."]);
    }

    if (
      !(await permissions.readManyTWUResourceQuestionResponseConsensuses(
        connection,
        request.session,
        validatedTWUOpportunity.value
      ))
    ) {
      return respond(401, [permissions.ERROR_MESSAGE]);
    }
    const dbResult = await db.readManyTWUResourceQuestionResponseEvaluations(
      connection,
      request.session,
      request.params.opportunityId,
      true
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
