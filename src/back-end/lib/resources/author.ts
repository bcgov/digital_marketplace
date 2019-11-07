import * as crud from 'back-end/lib/crud';
import { Connection, createAuthor, readManyAuthors } from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, JsonResponseBody, makeJsonResponseBody, Response } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { getString } from 'shared/lib';
import { CreateRequestBody, CreateValidationErrors } from 'shared/lib/resources/author';
import { Author, Session } from 'shared/lib/types';
import { allValid, getInvalidValue, validateAuthorFirstName, validateAuthorLastName, validateAuthorMiddleName } from 'shared/lib/validators';

type Resource = crud.Resource<SupportedRequestBodies, SupportedResponseBodies, CreateRequestBody, null, Session, Connection>;

type CreateResponseBody = Author | CreateValidationErrors;

const resource: Resource = {
  routeNamespace: 'authors',

  create(connection) {
    return {
      transformRequest: async ({ body }) => ({
        firstName: getString(body, ['value', 'firstName']),
        lastName: getString(body, ['value', 'lastName']),
        middleName: getString(body, ['value', 'middleName']) || undefined
      }),
      async respond(request): Promise<Response<JsonResponseBody<CreateResponseBody>, Session>> {
        const respond = (code: number, body: CreateResponseBody) => basicResponse(code, request.session, makeJsonResponseBody(body));
        if (!permissions.createAuthor(request.session)) {
          return respond(401, {
            permissions: [permissions.ERROR_MESSAGE]
          });
        }
        const { firstName, lastName, middleName } = request.body;
        const validatedFirstName = validateAuthorFirstName(firstName);
        const validatedLastName = validateAuthorLastName(lastName);
        const validatedMiddleName = validateAuthorMiddleName(middleName);
        if (allValid([validatedFirstName, validatedLastName, validatedMiddleName])) {
          const author = await createAuthor(connection, {
            firstName: validatedFirstName.value as string,
            middleName: validatedMiddleName.value as string,
            lastName: validatedLastName.value as string
          });
          return respond(201, author);
        } else {
          return respond(400, {
            firstName: getInvalidValue(validatedFirstName, undefined),
            middleName: getInvalidValue(validatedMiddleName, undefined),
            lastName: getInvalidValue(validatedLastName, undefined)
          });
        }
      }
    }
  },

  readMany(connection) {
    return {
      transformRequest: async ({ body }) => null,
      async respond(request) {
        const respond = (code: number, body: Author[] | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
        if (!permissions.readManyAuthors(request.session)) {
          return respond(401, [permissions.ERROR_MESSAGE]);
        }
        const authors = await readManyAuthors(connection);
        return respond(200, authors);
      }
    }
  }
}

export default resource;
