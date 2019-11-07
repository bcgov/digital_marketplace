import * as crud from 'back-end/lib/crud';
import { Connection, createBookAvailabilitySubscription, deleteBookAvailabilitySubscription, getBookAvailabilitySubscriptionStatus } from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, JsonResponseBody, makeJsonResponseBody, Response } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { validateBookId } from 'back-end/lib/validators';
import { getString } from 'shared/lib';
import { CreateRequestBody, CreateValidationErrors } from 'shared/lib/resources/book-availability-subscription';
import { Book, Session } from 'shared/lib/types';
import { getInvalidValue } from 'shared/lib/validators';

type Resource = crud.Resource<SupportedRequestBodies, SupportedResponseBodies, CreateRequestBody, null, Session, Connection>;

type CreateResponseBody = Book | CreateValidationErrors;

const resource: Resource = {
  routeNamespace: 'bookAvailabilitySubscriptions',

  create(connection) {
    return {
      transformRequest: async ({ body }) => ({
        book: getString(body, ['value', 'book'])
      }),
      async respond(request): Promise<Response<JsonResponseBody<CreateResponseBody>, Session>> {
        const respond = (code: number, body: CreateResponseBody) => basicResponse(code, request.session, makeJsonResponseBody(body));
        if (!permissions.createBookAvailabilitySubscription(request.session) || !request.session.user || request.session.user.tag !== 'user') {
          return respond(401, {
            permissions: [permissions.ERROR_MESSAGE]
          });
        }
        const userId = request.session.user.value.id;
        const validatedBook = await validateBookId(connection, request.body.book, userId, true);
        if (validatedBook.tag === 'invalid') {
          return respond(400, {
            book: getInvalidValue(validatedBook, undefined)
          });
        }
        const bookId = validatedBook.value.id;
        const alreadySubscribed = await getBookAvailabilitySubscriptionStatus(connection, bookId, userId);
        if (alreadySubscribed) {
          return respond(200, validatedBook.value);
        }
        const book = await createBookAvailabilitySubscription(connection, validatedBook.value.id, userId);
        return respond(201, book);
      }
    }
  },

  // The path ID parameter corresponds to book ID.
  delete(connection) {
    return {
      transformRequest: async ({ body }) => null,
      async respond(request): Promise<Response<JsonResponseBody<Book | string[]>, Session>> {
        const respond = (code: number, body: Book | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
        if (!permissions.deleteBookAvailabilitySubscription(request.session) || !request.session.user || request.session.user.tag !== 'user') {
          return respond(401, [permissions.ERROR_MESSAGE]);
        }

        const validatedBook = await validateBookId(connection, request.params.id);
        if (validatedBook.tag === 'invalid') {
          return respond(400, validatedBook.value);
        }
        const userId = request.session.user.value.id;
        const book = await deleteBookAvailabilitySubscription(connection, validatedBook.value.id, userId);
        return respond(200, book);
      }
    }
  }
}

export default resource;
