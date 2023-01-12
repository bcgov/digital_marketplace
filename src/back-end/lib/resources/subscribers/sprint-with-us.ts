import * as crud from "back-end/lib/crud";
import * as db from "back-end/lib/db";
import * as permissions from "back-end/lib/permissions";
import {
  basicResponse,
  JsonResponseBody,
  makeJsonResponseBody,
  wrapRespond
} from "back-end/lib/server";
import { validateSWUOpportunityId } from "back-end/lib/validation";
import { omit } from "lodash";
import { getString } from "shared/lib";
import { AuthenticatedSession, Session } from "shared/lib/resources/session";
import {
  CreateRequestBody,
  CreateValidationErrors,
  DeleteValidationErrors,
  SWUOpportunitySubscriber
} from "shared/lib/resources/subscribers/sprint-with-us";
import { Id } from "shared/lib/types";
import { invalid, isInvalid, valid } from "shared/lib/validation";

interface ValidatedCreateRequestBody {
  opportunity: Id;
  user: Id;
  session: AuthenticatedSession;
}

interface ValidatedDeleteRequestBody {
  opportunity: Id;
  user: Id;
  session: AuthenticatedSession;
}

const routeNamespace = "subscribers/sprint-with-us";

const create: crud.Create<
  Session,
  db.Connection,
  CreateRequestBody,
  ValidatedCreateRequestBody,
  CreateValidationErrors
> = (connection: db.Connection) => {
  return {
    async parseRequestBody(request) {
      const body: unknown =
        request.body.tag === "json" ? request.body.value : {};
      return {
        opportunity: getString(body, "opportunity")
      };
    },
    async validateRequestBody(request) {
      const { opportunity } = request.body;

      if (!permissions.isSignedIn(request.session)) {
        return invalid({
          permissions: [permissions.ERROR_MESSAGE]
        });
      }

      const validatedSWUOpportunity = await validateSWUOpportunityId(
        connection,
        opportunity,
        request.session
      );
      if (isInvalid(validatedSWUOpportunity)) {
        return invalid({
          notFound: ["The specified opportunity does not exist"]
        });
      }

      // Don't allow subscribing to owned opportunity
      if (
        validatedSWUOpportunity.value.createdBy?.id === request.session.user.id
      ) {
        return invalid({
          opportunity: ["You cannot subscribe to your own opportunity."]
        });
      }

      // Check for existing subscription for this user
      const dbResult = await db.readOneSWUSubscriberByOpportunityAndUser(
        connection,
        validatedSWUOpportunity.value.id,
        request.session.user.id,
        request.session
      );
      if (isInvalid(dbResult)) {
        return invalid({
          database: [db.ERROR_MESSAGE]
        });
      }
      if (dbResult.value) {
        return invalid({
          conflict: ["This user is already subscribed to this opportunity."]
        });
      }

      return valid({
        session: request.session,
        opportunity: validatedSWUOpportunity.value.id,
        user: request.session.user.id
      });
    },
    respond: wrapRespond<
      ValidatedCreateRequestBody,
      CreateValidationErrors,
      JsonResponseBody<SWUOpportunitySubscriber>,
      JsonResponseBody<CreateValidationErrors>,
      Session
    >({
      valid: async (request) => {
        const dbResult = await db.createSWUOpportunitySubscriber(
          connection,
          omit(request.body, "session"),
          request.session
        );
        if (isInvalid(dbResult)) {
          return basicResponse(
            503,
            request.session,
            makeJsonResponseBody({ database: [db.ERROR_MESSAGE] })
          );
        }
        return basicResponse(
          201,
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
};

const delete_: crud.Delete<
  Session,
  db.Connection,
  ValidatedDeleteRequestBody,
  DeleteValidationErrors
> = (connection: db.Connection) => {
  return {
    async validateRequestBody(request) {
      if (!permissions.isSignedIn(request.session)) {
        return invalid({
          permissions: [permissions.ERROR_MESSAGE]
        });
      }
      const validatedSWUOpportunity = await validateSWUOpportunityId(
        connection,
        request.params.id,
        request.session
      );
      if (isInvalid(validatedSWUOpportunity)) {
        return invalid({ notFound: ["Opportunity not found."] });
      }
      // Check for existing subscription for this user
      const dbResult = await db.readOneSWUSubscriberByOpportunityAndUser(
        connection,
        validatedSWUOpportunity.value.id,
        request.session.user.id,
        request.session
      );
      if (isInvalid(dbResult)) {
        return invalid({
          database: [db.ERROR_MESSAGE]
        });
      }
      if (!dbResult.value) {
        return invalid({
          notFound: ["This user is not subscribed to this opportunity."]
        });
      }
      return valid({
        opportunity: validatedSWUOpportunity.value.id,
        user: request.session.user.id,
        session: request.session
      });
    },
    respond: wrapRespond({
      valid: async (request) => {
        const dbResult = await db.deleteSWUOpportunitySubscriber(
          connection,
          request.body,
          request.session
        );
        if (isInvalid(dbResult)) {
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
};

const resource: crud.BasicCrudResource<Session, db.Connection> = {
  routeNamespace,
  create,
  delete: delete_
};

export default resource;
