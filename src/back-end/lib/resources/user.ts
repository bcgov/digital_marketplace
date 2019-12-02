import * as crud from 'back-end/lib/crud';
import { Connection, readManyUsers, readOneUser, updateUser } from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, makeJsonResponseBody } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { getString } from 'shared/lib';
import { Session } from 'shared/lib/resources/session';
import { UpdateRequestBody, User, UserStatus } from 'shared/lib/resources/user';
import { isBoolean, isObject } from 'util';

type Resource = crud.Resource<SupportedRequestBodies, SupportedResponseBodies, null, UpdateRequestBody, Session, Connection>;

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
  },

  update(connection) {
    return {
      async transformRequest(request) {
        const body = request.body.tag === 'json' ? request.body.value : {};
        return {
          id: request.params.id,
          name: getString(body, 'name') || undefined,
          email: getString(body, 'email') || undefined,
          avatarImageFile: isObject(body.avatarImageFile) ? body.avatarImageFile : undefined,
          notificationsOn: isBoolean(body.notificationsOn) ? body.notificationsOn : undefined
        };
      },
      async respond(request) {
        const respond = (code: number, body: User | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
        if (!permissions.updateUser(request.session, request.id)) {
          return respond(401, [permissions.ERROR_MESSAGE]);
        }
        const updatedUser = await updateUser(connection, request);
        return respond(200, updatedUser);
      }
    };
  },

  delete(connection) {
    return {
      transformRequest: async ({ body }) => null,
      async respond(request) {
        const respond = (code: number, body: User | null | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
        if (!permissions.deleteUser(request.session, request.params.id)) {
          return respond(401, [permissions.ERROR_MESSAGE]);
        }

        const user = await readOneUser(connection, request.params.id);
        if (!user) {
          return respond(404, null);
        }

        // If this own account, then mark as deactivated by user, otherwise by admin
        let updatedUser: User;
        if (permissions.isOwnAccount(request.session, request.params.id)) {
          updatedUser = await updateUser(connection, { id: request.params.id, status: UserStatus.InactiveByUser });
        } else {
          updatedUser = await updateUser(connection, { id: request.params.id, status: UserStatus.InactiveByAdmin });
        }

        return respond(200, updatedUser);
      }
    };
  }
};

export default resource;
