import * as crud from 'back-end/lib/crud';
import { Connection, readManyUsers, readOneUser, updateUser } from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, JsonResponseBody, makeJsonResponseBody, nullRequestBodyHandler } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { validateImageFile, validateUserId } from 'back-end/lib/validation';
import { isBoolean } from 'lodash';
import { getString } from 'shared/lib';
import { PublicFile } from 'shared/lib/resources/file';
import { Session } from 'shared/lib/resources/session';
import { UpdateRequestBody, UpdateValidationErrors, User, UserStatus } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';
import { allValid, getInvalidValue, invalid, valid } from 'shared/lib/validation';
import { validateAcceptedTerms, validateEmail, validateName, validateNotificationsOn } from 'shared/lib/validation/user';

export interface ValidatedUpdateRequestBody extends Omit<UpdateRequestBody, 'avatarImageFile' | 'notificationsOn' | 'acceptedTerms'> {
  avatarImageFile?: PublicFile;
  notificationsOn?: Date;
  acceptedTerms?: Date;
  deactivatedOn?: Date;
  deactivatedBy?: Id;
  status?: UserStatus;
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
          notificationsOn: isBoolean(body.notificationsOn) ? body.notificationsOn : undefined,
          acceptedTerms: isBoolean(body.acceptedTerms) ? body.acceptedTerms : undefined
        };
      },
      async validateRequestBody(request) {
        const { id, name, email, avatarImageFile, notificationsOn, acceptedTerms } = request.body;
        const validatedUserId = await validateUserId(connection, id);
        const validatedName = name ? validateName(name) : valid(undefined);
        const validatedEmail = email ? validateEmail(email) : valid(undefined);
        const validatedAvatarImageFile = avatarImageFile ? await validateImageFile(connection, avatarImageFile) : valid(undefined);
        const validatedNotificationsOn = notificationsOn !== undefined ? validateNotificationsOn(notificationsOn) : valid(undefined);
        const validatedAcceptedTerms = acceptedTerms !== undefined ? validateAcceptedTerms(acceptedTerms) : valid(undefined);

        if (allValid([validatedUserId, validatedName, validatedEmail, validatedAvatarImageFile, validatedNotificationsOn, validatedAcceptedTerms])) {

          // Check for admin role, and if not own account, ensure only user id was provided (re-activation scenario)
          // Admin shouldn't provide any other updates to profile
          if (permissions.isAdmin(request.session) && !permissions.isOwnAccount(request.session, id)) {
            if (validatedName.value || validatedEmail.value || validatedAvatarImageFile.value || validatedNotificationsOn.value || validatedAcceptedTerms.value) {
              return invalid({
                permissions: [permissions.ERROR_MESSAGE]
              });
            }
            return valid({
              id: (validatedUserId.value as User).id,
              status: UserStatus.Active
            });
          }

          return valid({
            id: (validatedUserId.value as User).id,
            name: validatedName.value,
            email: validatedEmail.value,
            avatarImageFile: validatedAvatarImageFile.value,
            notificationsOn: validatedNotificationsOn.value,
            acceptedTerms: validatedAcceptedTerms.value
          });
        } else {
          return invalid({
            id: getInvalidValue(validatedUserId, undefined),
            name: getInvalidValue(validatedName, undefined),
            email: getInvalidValue(validatedEmail, undefined),
            avatarImageFile: getInvalidValue(validatedAvatarImageFile, undefined),
            notificationsOn: getInvalidValue(validatedNotificationsOn, undefined),
            acceptedTerms: getInvalidValue(validatedAcceptedTerms, undefined)
          });
        }
      },
      async respond(request) {
        const respond = (code: number, body: User | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
        if (!permissions.updateUser(request.session, request.params.id)) {
          return respond(401, [permissions.ERROR_MESSAGE]);
        }
        switch (request.body.tag) {
          case 'invalid':
            if (request.body.value.permissions) {
              return basicResponse(401, request.session, makeJsonResponseBody(request.body.value));
            }
            return basicResponse(400, request.session, makeJsonResponseBody(request.body.value));
          case 'valid':
            const updatedUser = await updateUser(connection, request.body.value);
            return respond(200, updatedUser);
        }
      }
    };
  },

  delete(connection) {
    return {
      async validateRequestBody(request) {
        const user = await readOneUser(connection, request.params.id);
        if (!user) {
          return invalid(['User not found.']);
        }
        if (user.status !== UserStatus.Active) {
          return invalid(['User is already inactive.']);
        }
        return valid(user);
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
        // Track the date the user was made inactive, and the user id of the user that made them inactive
        const status = permissions.isOwnAccount(request.session, id) ? UserStatus.InactiveByUser : UserStatus.InactiveByAdmin;
        const updatedUser = await updateUser(connection, {
          id,
          status,
          deactivatedOn: new Date(),
          deactivatedBy: request.session.user!.id
        });
        return respond(200, updatedUser);
      }
    };
  }
};

export default resource;
