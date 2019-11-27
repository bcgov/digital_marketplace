import * as crud from 'back-end/lib/crud';
import { Connection, readManyUsers } from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, makeJsonResponseBody } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { Session } from 'shared/lib/resources/session';
import { User } from 'shared/lib/resources/user';

type Resource = crud.Resource<SupportedRequestBodies, SupportedResponseBodies, null, null, Session, Connection>;

const resource: Resource = {
  routeNamespace: 'users',
  readMany(connection) {
    return {
      transformRequest: async ({ body }) => null,
      async respond(request) {
        const respond = (code: number, body: User[] | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
        if (!permissions.readManyUsers(request.session)) {
          return respond(401, [permissions.ERROR_MESSAGE]);
        }
        const users = await readManyUsers(connection);
        return respond(200, users);
      }
    };
  }
};

export default resource;
