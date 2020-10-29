import { getString } from 'back-end/../shared/lib';
import { allValid, getInvalidValue, invalid, isInvalid, isValid, valid, validateUUID } from 'back-end/../shared/lib/validation';
import * as crud from 'back-end/lib/crud';
import * as db from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, JsonResponseBody, makeJsonResponseBody, nullRequestBodyHandler, wrapRespond } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { Content, ContentSlim, CreateRequestBody, CreateValidationErrors, DeleteValidationErrors, UpdateRequestBody, UpdateValidationErrors } from 'shared/lib/resources/content';
import { AuthenticatedSession, Session } from 'shared/lib/resources/session';
import * as contentValidation from 'shared/lib/validation/content';

export type ValidatedCreateRequestBody = CreateRequestBody;

export type ValidatedUpdateRequestBody = UpdateRequestBody;

type Resource = crud.Resource<
  SupportedRequestBodies,
  SupportedResponseBodies,
  CreateRequestBody,
  ValidatedCreateRequestBody,
  CreateValidationErrors,
  null,
  null,
  UpdateRequestBody,
  ValidatedUpdateRequestBody,
  UpdateValidationErrors,
  null,
  DeleteValidationErrors,
  Session,
  db.Connection
>;

const resource: Resource = {
  routeNamespace: 'content',

  readMany(connection) {
    return nullRequestBodyHandler<JsonResponseBody<ContentSlim[] | string[]>, Session>(async request => {
      const respond = (code: number, body: ContentSlim[] | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
      if (!permissions.readManyContent(request.session)) {
        return respond(401, [permissions.ERROR_MESSAGE]);
      }
      const dbResult = await db.readManyContent(connection);
      if (isInvalid(dbResult)) {
        return respond(503, [db.ERROR_MESSAGE]);
      }
      return respond(200, dbResult.value);
    });
  },

  readOne(connection) {
    return nullRequestBodyHandler<JsonResponseBody<Content | string[]>, Session>(async request => {
      const respond = (code: number, body: Content | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
      // Validate the provided id or slug
      // If it's a valid UUID, query by id.
      // If not a valid UUID, or query by id failed (possible a UUID was used as a slug), then query by slug
      const validatedId = validateUUID(request.params.id);
      let dbResult = null;
      if (isValid(validatedId)) {
        dbResult = await db.readOneContentById(connection, validatedId.value, request.session);
      }

      if (!dbResult || isInvalid(dbResult) || !dbResult.value) {
        const validatedSlug = contentValidation.validateSlug(request.params.id);
        if (isInvalid(validatedSlug)) {
          return respond(400, validatedSlug.value);
        }
        dbResult = await db.readOneContentBySlug(connection, validatedSlug.value, request.session);
      }

      if (isInvalid(dbResult)) {
        return respond(503, [db.ERROR_MESSAGE]);
      }

      if (!dbResult.value) {
        return respond(404, ['Content not found']);
      }

      return respond(200, dbResult.value);
    });
  },

  create(connection) {
    return {
      async parseRequestBody(request) {
        const body: unknown = request.body.tag === 'json' ? request.body.value : {};
        return {
          slug: getString(body, 'slug'),
          title: getString(body, 'title'),
          body: getString(body, 'body')
        };
      },
      async validateRequestBody(request) {
        if (!permissions.createContent(request.session) || !permissions.isSignedIn(request.session)) {
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
            const dbResult = await db.readOneContentBySlug(connection, validatedSlug.value, session);
            if (isInvalid(dbResult)) {
              return invalid({
                database: [db.ERROR_MESSAGE]
              });
            }
            if (isValid(dbResult) && dbResult.value) {
              return invalid({
                conflict: ['This slug is already in use.']
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
      respond: wrapRespond<ValidatedCreateRequestBody, CreateValidationErrors, JsonResponseBody<Content>, JsonResponseBody<CreateValidationErrors>, Session>({
        valid: (async request => {
          const dbResult = await db.createContent(connection, request.body, request.session);
          if (isInvalid(dbResult)) {
            return basicResponse(503, request.session, makeJsonResponseBody({ database: [db.ERROR_MESSAGE] }));
          }
          return basicResponse(201, request.session, makeJsonResponseBody(dbResult.value));
        }),
        invalid: (async request => {
          return basicResponse(400, request.session, makeJsonResponseBody(request.body));
        })
      })
    };
  }
};

export default resource;
