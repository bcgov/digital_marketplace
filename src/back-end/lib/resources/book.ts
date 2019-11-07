import * as crud from 'back-end/lib/crud';
import { Connection, createBook, readManyBooks, readManyGenreSubscriptions } from 'back-end/lib/db';
import * as mailer from 'back-end/lib/mailer';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, JsonResponseBody, makeJsonResponseBody, Response } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { validateAuthorIds } from 'back-end/lib/validators';
import { getString, getStringArray } from 'shared/lib';
import { CreateRequestBody, CreateValidationErrors } from 'shared/lib/resources/book';
import { Author, Book, Session } from 'shared/lib/types';
import { allValid, getInvalidValue, validateBookDescription, validateBookTitle, validateGenre } from 'shared/lib/validators';

type Resource = crud.Resource<SupportedRequestBodies, SupportedResponseBodies, CreateRequestBody, null, Session, Connection>;

type CreateResponseBody = Book | CreateValidationErrors;

const resource: Resource = {
  routeNamespace: 'books',

  create(connection) {
    return {
      transformRequest: async ({ body }) => ({
        title: getString(body, ['value', 'title']),
        description: getString(body, ['value', 'description']),
        authors: getStringArray(body, ['value', 'authors']),
        genre: getString(body, ['value', 'genre'])
      }),
      async respond(request): Promise<Response<JsonResponseBody<CreateResponseBody>, Session>> {
        const respond = (code: number, body: Book | CreateResponseBody) => basicResponse(code, request.session, makeJsonResponseBody(body));
        if (!permissions.createBook(request.session)) {
          return respond(401, {
            permissions: [permissions.ERROR_MESSAGE]
          });
        }
        const { title, description, authors, genre } = request.body;
        const validatedTitle = validateBookTitle(title);
        const validatedDescription = validateBookDescription(description);
        const validatedGenre = validateGenre(genre);
        const validatedAuthors = await validateAuthorIds(connection, authors);
        if (allValid([validatedTitle, validatedDescription, validatedGenre, validatedAuthors])) {
          const book = await createBook(connection, {
            title: validatedTitle.value as string,
            description: validatedDescription.value as string,
            genre: validatedGenre.value as string,
            authors: (validatedAuthors.value as Author[]).map(({ id }) => id)
          });

          // notify any users subscribed to this book genre of the new addition
          const subscribedUsers = await readManyGenreSubscriptions(connection, book.genre.name);
          for await (const user of subscribedUsers) {
            mailer.bookWithGenreAdded(user.email, book);
          }

          return respond(201, book);
        } else {
          return respond(400, {
            title: getInvalidValue(validatedTitle, undefined),
            description: getInvalidValue(validatedDescription, undefined),
            genre: getInvalidValue(validatedGenre, undefined),
            authors: getInvalidValue(validatedAuthors, undefined)
          });
        }
      }
    }
  },

  readMany(connection) {
    return {
      transformRequest: async ({ body }) => null,
      async respond(request) {
        const respond = (code: number, body: Book[] | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
        if (!permissions.readManyBooks()) {
          return respond(401, [permissions.ERROR_MESSAGE]);
        }
        const userId = request.session.user && request.session.user.tag === 'user' ? request.session.user.value.id : undefined;
        const books = await readManyBooks(connection, userId)
        return respond(200, books);
      }
    }
  }
}

export default resource;
