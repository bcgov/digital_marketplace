import * as crud from 'back-end/lib/crud';
import { Connection, readManyUsers, readOneUser, updateUser } from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, JsonResponseBody, makeJsonResponseBody, nullRequestBodyHandler } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { isBoolean } from 'lodash';
import { getString } from 'shared/lib';
import { PublicFile } from 'shared/lib/resources/file';
import { Session } from 'shared/lib/resources/session';
import { UpdateRequestBody, UpdateValidationErrors, User, UserStatus } from 'shared/lib/resources/user';
import { invalid, valid } from 'shared/lib/validation';

interface ValidatedUpdateRequestBody extends Omit<UpdateRequestBody, 'avatarImageFile'> {
  avatarImageFile?: PublicFile;
}

type DeleteValidatedReqBody = User;

type DeleteReqBodyErrors = string[];

type Resource = crud.Resource<
  SupportedRequestBodies,
  SupportedResponseBodies,
  null,
  null,
  null,
  null,
  null,
  UpdateRequestBody,
  ValidatedUpdateRequestBody,
  UpdateValidationErrors,
  DeleteValidatedReqBody,
  DeleteReqBodyErrors,
  Session,
  Connection
>;

const resource: Resource = {
  routeNamespace: 'users',

  readMany(connection) {
    return nullRequestBodyHandler<JsonResponseBody<User[] | string[]>, Session>(async request => {
      const respond = (code: number, body: User[] | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
      if (!permissions.readManyUsers(request.session)) {
        return respond(401, [permissions.ERROR_MESSAGE]);
      }
      const users = await readManyUsers(connection);
      return respond(200, users);
    });
  },

  update(connection) {
    return {
      parseRequestBody(request) {
        const body = request.body.tag === 'json' ? request.body.value : {};
        return {
          id: request.params.id,
          name: getString(body, 'name') || undefined,
          email: getString(body, 'email') || undefined,
          avatarImageFile: getString(body, 'avatarImageFile') || undefined,
          notificationsOn: isBoolean(body.notificationsOn) ? body.notificationsOn : undefined
        };
      },
      async validateRequestBody(request) {
        // TODO implement
        return invalid({ todo: true as const });
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
      async validateRequestBody(request) {
        const user = await readOneUser(connection, request.params.id);
        return user ? valid(user) : invalid(['User not found']);
      },
      async respond(request) {
        const respond = (code: number, body: User | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
        if (request.body.tag === 'invalid') {
          return respond(404, request.body.value);
        }
        const id = request.body.value.id;
        if (!permissions.deleteUser(request.session, id)) {
          return respond(401, [permissions.ERROR_MESSAGE]);
        }
        // If this own account, then mark as deactivated by user, otherwise by admin
        // TODO do we need to track the date the user was made active, and the user id of the user that made them inactive?
        let updatedUser: User;
        if (permissions.isOwnAccount(request.session, id)) {
          updatedUser = await updateUser(connection, { id, status: UserStatus.InactiveByUser });
        } else {
          updatedUser = await updateUser(connection, { id, status: UserStatus.InactiveByAdmin });
        }
        return respond(200, updatedUser);
      }
    };
  }
};

export default resource;
