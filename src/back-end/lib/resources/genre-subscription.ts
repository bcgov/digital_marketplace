import * as crud from 'back-end/lib/crud';
import { Connection, createGenreSubscription, deleteGenreSubscription, getGenreSubscriptionStatus } from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, JsonResponseBody, makeJsonResponseBody, Response } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { getString } from 'shared/lib';
import { CreateRequestBody, CreateValidationErrors } from 'shared/lib/resources/genre-subscription';
import { Genre, Session } from 'shared/lib/types';
import { getInvalidValue, validateGenre } from 'shared/lib/validators';

type Resource = crud.Resource<SupportedRequestBodies, SupportedResponseBodies, CreateRequestBody, null, Session, Connection>;

type CreateResponseBody = Genre | CreateValidationErrors;

const resource: Resource = {
  routeNamespace: 'genreSubscriptions',

  create(connection) {
    return {
      transformRequest: async ({ body }) => ({
        genre: getString(body, ['value', 'genre'])
      }),
      async respond(request): Promise<Response<JsonResponseBody<CreateResponseBody>, Session>> {
        const respond = (code: number, body: CreateResponseBody) => basicResponse(code, request.session, makeJsonResponseBody(body));
        if (!permissions.createGenreSubscription(request.session) || !request.session.user || request.session.user.tag !== 'user') {
          return respond(401, {
            permissions: [permissions.ERROR_MESSAGE]
          });
        }
        const userId = request.session.user.value.id;
        const validatedGenre = validateGenre(request.body.genre);
        if (validatedGenre.tag === 'invalid') {
          return respond(400, {
            genre: getInvalidValue(validatedGenre, undefined)
          });
        }
        const alreadySubscribed = await getGenreSubscriptionStatus(connection, validatedGenre.value, userId);
        if (alreadySubscribed) {
          return respond(200, {
            name: validatedGenre.value,
            subscribed: true
          });
        }
        const genre = await createGenreSubscription(connection, validatedGenre.value, userId);
        return respond(201, genre);
      }
    }
  },

  // The path ID parameter corresponds to a genre name.
  delete(connection) {
    return {
      transformRequest: async ({ body }) => null,
      async respond(request): Promise<Response<JsonResponseBody<Genre | string[]>, Session>> {
        const respond = (code: number, body: Genre | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
        if (!permissions.deleteGenreSubscription(request.session) || !request.session.user || request.session.user.tag !== 'user') {
          return respond(401, [permissions.ERROR_MESSAGE]);
        }
        const validatedGenre = validateGenre(request.params.id);
        if (validatedGenre.tag === 'invalid') {
          return respond(400, validatedGenre.value);
        }
        const userId = request.session.user.value.id;
        const genre = await deleteGenreSubscription(connection, validatedGenre.value, userId);
        return respond(200, genre);
      }
    }
  }
}

export default resource;
