import * as crud from 'back-end/lib/crud';
import { Connection, deleteSession } from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, makeJsonResponseBody } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { Session } from 'shared/lib/resources/session';

type Resource = crud.Resource<SupportedRequestBodies, SupportedResponseBodies, null, null, Session, Connection>;

const resource: Resource = {

  routeNamespace: 'sessions',

  readOne(connection) {
    return {
      transformRequest: async ({ body }) => null,
      async respond(request) {
        const respond = (code: number, body: Session | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
        if (!permissions.readOneSession(request.session, request.params.id)) {
          return respond(401, [permissions.ERROR_MESSAGE]);
        }
        return respond(200, request.session);
      }
    };
  },

  delete(connection) {
    return {
      transformRequest: async ({ body }) => null,
      async respond(request) {
        const respond = (code: number, body: null | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
        if (!permissions.deleteSession(request.session, request.params.id)) {
          return respond(401, [permissions.ERROR_MESSAGE]);
        }
        await deleteSession(connection, request.session.id);
        return respond(200, null);
      }
    };
  }
};

export default resource;
