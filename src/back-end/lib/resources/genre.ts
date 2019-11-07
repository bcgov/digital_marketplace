import * as crud from 'back-end/lib/crud';
import { Connection, readManyGenres} from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, makeJsonResponseBody } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { Genre, Session } from 'shared/lib/types';

type Resource = crud.Resource<SupportedRequestBodies, SupportedResponseBodies, null, null, Session, Connection>;

const resource: Resource = {
  routeNamespace: 'genres',
  readMany(connection) {
    return {
      transformRequest: async ({ body }) => null,
      async respond(request) {
        const respond = (code: number, body: Genre[] | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
        if (!permissions.readManyGenres()) {
          return respond(401, [permissions.ERROR_MESSAGE]);
        }
        const userId = request.session.user && request.session.user.tag === 'user' ? request.session.user.value.id : undefined;
        const genres = await readManyGenres(connection, userId)
        return respond(200, genres);
      }
    }
  }
}

export default resource;
