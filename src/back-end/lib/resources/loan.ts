import * as crud from 'back-end/lib/crud';
import { Connection, createLoan, deleteLoan, readManyBookAvailabilitySubscriptions, readOneBook } from 'back-end/lib/db';
import * as mailer from 'back-end/lib/mailer';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, JsonResponseBody, makeJsonResponseBody, Response } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { validateBookId, validateLoanId, validateUserId } from 'back-end/lib/validators';
import { getString } from 'shared/lib';
import { CreateRequestBody, CreateValidationErrors } from 'shared/lib/resources/loan';
import { Book, Loan, Session, User } from 'shared/lib/types';
import { allValid, getInvalidValue, validateLoanDueAt } from 'shared/lib/validators';

type Resource = crud.Resource<SupportedRequestBodies, SupportedResponseBodies, CreateRequestBody, null, Session, Connection>;

type CreateResponseBody = Loan | CreateValidationErrors;

const resource: Resource = {
  routeNamespace: 'loans',

  create(connection) {
    return {
      transformRequest: async ({ body }) => ({
        user: getString(body, ['value', 'user']),
        book: getString(body, ['value', 'book']),
        dueAt: getString(body, ['value', 'dueAt'])
      }),
      async respond(request): Promise<Response<JsonResponseBody<CreateResponseBody>, Session>> {
        const respond = (code: number, body: CreateResponseBody) => basicResponse(code, request.session, makeJsonResponseBody(body));
        if (!permissions.createLoan(request.session)) {
          return respond(401, {
            permissions: [permissions.ERROR_MESSAGE]
          });
        }
        const { user, book, dueAt } = request.body;
        const validatedUser = await validateUserId(connection, user);
        const validatedBook = await validateBookId(connection, book);
        const validatedDueAt = validateLoanDueAt(dueAt);
        if (allValid([validatedUser, validatedBook, validatedDueAt])) {
          const loan = await createLoan(connection, {
            user: (validatedUser.value as User).id,
            book: (validatedBook.value as Book).id,
            dueAt: validatedDueAt.value as Date
          });
          return respond(201, loan);
        } else {
          return respond(400, {
            user: getInvalidValue(validatedUser, undefined),
            book: getInvalidValue(validatedBook, undefined),
            dueAt: getInvalidValue(validatedDueAt, undefined)
          });
        }
      }
    }
  },

  delete(connection) {
    return {
      transformRequest: async ({ body }) => null,
      async respond(request) {
        const respond = (code: number, body: null | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
        if (!permissions.deleteLoan(request.session)) {
          return respond(401, [permissions.ERROR_MESSAGE]);
        }
        const validatedLoan = await validateLoanId(connection, request.params.id, ['outstanding', 'overdue']);
        if (validatedLoan.tag === 'invalid') {
          return respond(400, validatedLoan.value);
        }

        // notify any users subscribed to the book for this loan
        const book = await readOneBook(connection, validatedLoan.value.bookId);
        if (book) {
          const subscribedUsers = await readManyBookAvailabilitySubscriptions(connection, book.id);
          for await (const user of subscribedUsers) {
            mailer.bookIsAvailable(user.email, book);
          }
        }

        await deleteLoan(connection, validatedLoan.value.id);
        return respond(200, null);
      }
    }
  }
}

export default resource;
