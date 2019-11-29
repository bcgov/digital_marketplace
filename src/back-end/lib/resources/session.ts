import axios from 'axios';
import { KEYCLOAK_CLIENT_ID, KEYCLOAK_CLIENT_SECRET, KEYCLOAK_REALM, KEYCLOAK_URL } from 'back-end/config';
import * as crud from 'back-end/lib/crud';
import { Connection, deleteSession, readOneSession,  } from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, makeJsonResponseBody } from 'back-end/lib/server';
import { ServerHttpMethod, SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import qs from 'querystring';
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

        const session = await readOneSession(connection, request.session.id);
        if (!session.accessToken) {
          return respond(200, null);
        }

        const formData = qs.stringify({
          client_id: KEYCLOAK_CLIENT_ID,
          client_secret: KEYCLOAK_CLIENT_SECRET,
          scope: 'openid',
          refresh_token: session.accessToken
        });

        await axios({
          method: ServerHttpMethod.Post,
          url: `${KEYCLOAK_URL}/auth/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout`,
          data: formData,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });

        // Delete the current session
        await deleteSession(connection, session.id);

        return respond(200, null);
      }
    };
  }
};

export default resource;
