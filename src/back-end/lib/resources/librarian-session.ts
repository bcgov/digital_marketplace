import * as crud from 'back-end/lib/crud';
import { Connection, updateSessionWithLibrarian } from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, JsonResponseBody, makeJsonResponseBody, Response } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { getString } from 'shared/lib';
import { CreateRequestBody } from 'shared/lib/resources/librarian-session';
import { Session } from 'shared/lib/types';

type Resource = crud.Resource<SupportedRequestBodies, SupportedResponseBodies, CreateRequestBody, null, Session, Connection>;

type CreateResponseBody = Session | string[];

const resource: Resource = {

  routeNamespace: 'librarianSessions',

  create(connection) {
    return {
      transformRequest: async ({ body }) => ({
        email: getString(body, ['value', 'email']),
        password: getString(body, ['value', 'password'])
      }),
      async respond(request): Promise<Response<JsonResponseBody<CreateResponseBody>, Session>> {
        if (!permissions.createLibrarianSession(request.session)) {
          return basicResponse(401, request.session, makeJsonResponseBody([permissions.ERROR_MESSAGE]));
        }
        try {
          const session = await updateSessionWithLibrarian(connection, request.session.id, request.body);
          return basicResponse(201, session, makeJsonResponseBody(session));
        } catch (error) {
          return basicResponse(400, request.session, makeJsonResponseBody(['The email and password combination you provided is incorrect.']));
        }
      }
    };
  }

}

export default resource;
