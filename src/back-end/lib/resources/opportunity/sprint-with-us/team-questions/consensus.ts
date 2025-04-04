import * as crud from "back-end/lib/crud";
import * as db from "back-end/lib/db";
import * as permissions from "back-end/lib/permissions";
import {
  JsonResponseBody,
  basicResponse,
  makeJsonResponseBody,
  nullRequestBodyHandler
} from "back-end/lib/server";
import { validateSWUOpportunityId } from "back-end/lib/validation";
import { SWUTeamQuestionResponseEvaluation } from "shared/lib/resources/evaluations/sprint-with-us/team-questions";
import { Session } from "shared/lib/resources/session";
import { isInvalid } from "shared/lib/validation";

const routeNamespace =
  "opportunity/sprint-with-us/:opportunityId/team-questions/consensus";

const readMany: crud.ReadMany<Session, db.Connection> = (
  connection: db.Connection
) => {
  return nullRequestBodyHandler<
    JsonResponseBody<SWUTeamQuestionResponseEvaluation[] | string[]>,
    Session
  >(async (request) => {
    const respond = (
      code: number,
      body: SWUTeamQuestionResponseEvaluation[] | string[]
    ) => basicResponse(code, request.session, makeJsonResponseBody(body));
    if (!permissions.isSignedIn(request.session)) {
      return respond(401, [permissions.ERROR_MESSAGE]);
    }

    const validatedSWUOpportunity = await validateSWUOpportunityId(
      connection,
      request.params.opportunityId,
      request.session
    );
    if (isInvalid(validatedSWUOpportunity)) {
      return respond(404, ["Sprint With Us opportunity not found."]);
    }

    if (
      !(await permissions.readManySWUTeamQuestionResponseConsensuses(
        connection,
        request.session,
        validatedSWUOpportunity.value
      ))
    ) {
      return respond(401, [permissions.ERROR_MESSAGE]);
    }
    const dbResult = await db.readManySWUTeamQuestionResponseEvaluations(
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
