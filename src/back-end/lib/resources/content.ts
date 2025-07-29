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
import { validateContentId } from "back-end/lib/validation";
import { get } from "lodash";
import { getString } from "shared/lib";
import {
  Content,
  ContentSlim,
  CreateRequestBody,
  CreateValidationErrors,
  DeleteValidationErrors,
  UpdateRequestBody,
  UpdateValidationErrors
} from "shared/lib/resources/content";
import { AuthenticatedSession, Session } from "shared/lib/resources/session";
import { Id } from "shared/lib/types";
import {
  allValid,
  getInvalidValue,
  invalid,
  isInvalid,
  isValid,
  valid,
  validateUUID
} from "shared/lib/validation";
import * as contentValidation from "shared/lib/validation/content";

export type ValidatedCreateRequestBody = CreateRequestBody;

export interface ValidatedUpdateRequestBody extends UpdateRequestBody {
  version: number;
}

export type ValidatedDeleteRequestBody = Id;

const routeNamespace = "content";

const readMany: crud.ReadMany<Session, db.Connection> = (
  connection: db.Connection
) => {
  return nullRequestBodyHandler<
    JsonResponseBody<ContentSlim[] | string[]>,
    Session
  >(async (request) => {
    const respond = (code: number, body: ContentSlim[] | string[]) =>
      basicResponse(code, request.session, makeJsonResponseBody(body));
    if (!permissions.readManyContent(request.session)) {
      return respond(401, [permissions.ERROR_MESSAGE]);
    }
    const dbResult = await db.readManyContent(connection);
    if (isInvalid(dbResult)) {
      return respond(503, [db.ERROR_MESSAGE]);
    }
    return respond(200, dbResult.value);
  });
};

const readOne: crud.ReadOne<Session, db.Connection> = (
  connection: db.Connection
) => {
  return nullRequestBodyHandler<JsonResponseBody<Content | string[]>, Session>(
    async (request) => {
      const respond = (code: number, body: Content | string[]) =>
        basicResponse(code, request.session, makeJsonResponseBody(body));
      // Validate the provided id or slug
      // If it's a valid UUID, query by id.
      // If not a valid UUID, or query by id failed (possible a UUID was used as a slug), then query by slug
      const validatedId = validateUUID(request.params.id);
      let dbResult: db.DatabaseValidation<Content | null> | null = null;
      if (isValid(validatedId)) {
        dbResult = await db.readOneContentById(
          connection,
          validatedId.value,
          request.session
        );
      }

      if (!dbResult || isInvalid(dbResult) || !dbResult.value) {
        const validatedSlug = contentValidation.validateSlug(request.params.id);
        if (isInvalid(validatedSlug)) {
          return respond(400, validatedSlug.value);
        }
        dbResult = await db.readOneContentBySlug(
          connection,
          validatedSlug.value,
          request.session
        );
      }

      if (isInvalid(dbResult)) {
        return respond(503, [db.ERROR_MESSAGE]);
      }

      if (!dbResult.value) {
        return respond(404, ["Content not found"]);
      }

      return respond(200, dbResult.value);
    }
  );
};

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
        slug: getString(body, "slug"),
        title: getString(body, "title"),
        body: getString(body, "body"),
        fixed: get<typeof body, string>(body, "fixed")
      };
    },
    async validateRequestBody(request) {
      if (
        !permissions.createContent(request.session) ||
        !permissions.isSignedIn(request.session)
      ) {
        return invalid({
          permissions: [permissions.ERROR_MESSAGE]
        });
      }
      const session: AuthenticatedSession = request.session;
      const { slug, title, body } = request.body;

      const validatedSlug = contentValidation.validateSlug(slug);
      const validatedTitle = contentValidation.validateTitle(title);
      const validatedBody = contentValidation.validateBody(body);

      if (allValid([validatedSlug, validatedTitle, validatedBody])) {
        // Check to see if slug is available
        if (isValid(validatedSlug)) {
          const dbResult = await db.readOneContentBySlug(
            connection,
            validatedSlug.value,
            session
          );
          if (isInvalid(dbResult)) {
            return invalid({
              database: [db.ERROR_MESSAGE]
            });
          }
          if (isValid(dbResult) && dbResult.value) {
            return invalid({
              slug: ["This slug is already in use."]
            });
          }
        }
        return valid({
          session,
          slug: validatedSlug.value,
          title: validatedTitle.value,
          body: validatedBody.value
        } as ValidatedCreateRequestBody);
      } else {
        return invalid({
          slug: getInvalidValue(validatedSlug, undefined),
          title: getInvalidValue(validatedTitle, undefined),
          body: getInvalidValue(validatedBody, undefined)
        });
      }
    },
    respond: wrapRespond<
      ValidatedCreateRequestBody,
      CreateValidationErrors,
      JsonResponseBody<Content>,
      JsonResponseBody<CreateValidationErrors>,
      Session
    >({
      valid: async (request) => {
        const dbResult = await db.createContent(
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

const update: crud.Update<
  Session,
  db.Connection,
  UpdateRequestBody,
  ValidatedUpdateRequestBody,
  UpdateValidationErrors
> = (connection: db.Connection) => {
  return {
    async parseRequestBody(request) {
      const body = request.body.tag === "json" ? request.body.value : {};
      return {
        slug: getString(body, "slug"),
        title: getString(body, "title"),
        body: getString(body, "body")
      };
    },
    async validateRequestBody(request) {
      if (
        !permissions.editContent(request.session) ||
        !permissions.isSignedIn(request.session)
      ) {
        return invalid({
          permissions: [permissions.ERROR_MESSAGE]
        });
      }
      const session: AuthenticatedSession = request.session;
      const validatedContent = await validateContentId(
        connection,
        request.params.id,
        session
      );
      if (isInvalid(validatedContent)) {
        return invalid({
          notFound: ["The specified content does not exists."]
        });
      }
      const existingContent = validatedContent.value;
      const { slug, title, body } = request.body;
      const validatedSlug = contentValidation.validateSlug(slug);
      const validatedTitle = contentValidation.validateTitle(title);
      const validatedBody = contentValidation.validateBody(body);

      if (allValid([validatedSlug, validatedTitle, validatedBody])) {
        // If content is fixed, and slug is being updated, disallow
        if (
          existingContent.fixed &&
          existingContent.slug !== validatedSlug.value
        ) {
          return invalid({
            fixed: ["You cannot change the slug of fixed content."]
          });
        }
        // If slug name is being updated, check to see if new slug name is available
        if (
          isValid(validatedSlug) &&
          existingContent.slug !== validatedSlug.value
        ) {
          const dbResult = await db.readOneContentBySlug(
            connection,
            validatedSlug.value,
            session
          );
          if (isInvalid(dbResult)) {
            return invalid({
              database: [db.ERROR_MESSAGE]
            });
          }
          if (isValid(dbResult) && dbResult.value) {
            return invalid({
              slug: ["This slug is already in use."]
            });
          }
        }
        return valid({
          session,
          slug: validatedSlug.value,
          title: validatedTitle.value,
          body: validatedBody.value,
          version: existingContent.version + 1 // Increment version number
        } as ValidatedUpdateRequestBody);
      } else {
        return invalid({
          slug: getInvalidValue(validatedSlug, undefined),
          title: getInvalidValue(validatedTitle, undefined),
          body: getInvalidValue(validatedBody, undefined)
        });
      }
    },
    respond: wrapRespond({
      valid: async (request) => {
        const dbResult = await db.updateContent(
          connection,
          request.params.id,
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

const delete_: crud.Delete<
  Session,
  db.Connection,
  ValidatedDeleteRequestBody,
  DeleteValidationErrors
> = (connection: db.Connection) => {
  return {
    async validateRequestBody(request) {
      if (
        !permissions.deleteContent(request.session) ||
        !permissions.isSignedIn(request.session)
      ) {
        return invalid({
          permissions: [permissions.ERROR_MESSAGE]
        });
      }
      const session: AuthenticatedSession = request.session;
      const validatedContent = await validateContentId(
        connection,
        request.params.id,
        session
      );
      if (isInvalid(validatedContent)) {
        return invalid({ notFound: ["Content not found."] });
      }
      if (validatedContent.value.fixed) {
        return invalid({ fixed: ["You cannot delete fixed content."] });
      }
      return valid(validatedContent.value.id);
    },
    respond: wrapRespond({
      valid: async (request) => {
        const dbResult = await db.deleteContent(
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
  readMany,
  readOne,
  create,
  update,
  delete: delete_
};

export default resource;
