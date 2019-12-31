import * as crud from 'back-end/lib/crud';
import { Connection, createAnonymousSession, readManyUsers, readOneUser, updateUser } from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import { signOut } from 'back-end/lib/resources/session';
import { basicResponse, JsonResponseBody, makeJsonResponseBody, nullRequestBodyHandler } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { validateImageFile, validateUserId } from 'back-end/lib/validation';
import { isBoolean } from 'lodash';
import { getString } from 'shared/lib';
import { Session } from 'shared/lib/resources/session';
import { parseUserType, UpdateRequestBody, UpdateValidationErrors, User, UserStatus, UserType } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';
import { allValid, getInvalidValue, getValidValue, invalid, mapValid, valid } from 'shared/lib/validation';
import { validateAcceptedTerms, validateEmail, validateJobTitle, validateName, validateNotificationsOn, validateUserType } from 'shared/lib/validation/user';

export interface ValidatedUpdateRequestBody extends Omit<UpdateRequestBody, 'avatarImageFile' | 'notificationsOn' | 'acceptedTerms'> {
  id: Id;
  avatarImageFile?: Id;
  notificationsOn?: Date;
  acceptedTerms?: Date;
  deactivatedOn?: Date;
  deactivatedBy?: Id;
  status?: UserStatus;
  type?: UserType;
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

  readOne(connection) {
    return nullRequestBodyHandler<JsonResponseBody<User | string[]>, Session>(async request => {
      const respond = (code: number, body: User | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
      const validatedUser = await validateUserId(connection, request.params.id);
      if (validatedUser.tag === 'invalid') {
        return respond(400, validatedUser.value);
      }
      if (!permissions.readOneUser(request.session, validatedUser.value.id)) {
        return respond(401, [permissions.ERROR_MESSAGE]);
      }
      return respond(200, validatedUser.value);
    });
  },

  update(connection) {
    return {
      async parseRequestBody(request) {
        const body = request.body.tag === 'json' ? request.body.value : {};
        return {
          name: getString(body, 'name') || undefined,
          email: getString(body, 'email') || undefined,
          jobTitle: getString(body, 'jobTitle'), // undefined means no change to job title, empty string means remove
          avatarImageFile: getString(body, 'avatarImageFile') || undefined,
          notificationsOn: isBoolean(body.notificationsOn) ? body.notificationsOn : undefined,
          acceptedTerms: isBoolean(body.acceptedTerms) ? body.acceptedTerms : undefined,
          type: parseUserType(body.type) || undefined
        };
      },
      async validateRequestBody(request) {
        const { type, name, email, jobTitle, avatarImageFile, notificationsOn, acceptedTerms } = request.body;
        const validatedUserId = await validateUserId(connection, request.params.id);
        const validatedName = name ? validateName(name) : valid(undefined);
        const validatedEmail = email ? validateEmail(email) : valid(undefined);
        const validatedJobTitle = validateJobTitle(jobTitle || '');
        const validatedAvatarImageFile = avatarImageFile ? await validateImageFile(connection, avatarImageFile) : valid(undefined);
        const validatedNotificationsOn = notificationsOn !== undefined ? validateNotificationsOn(notificationsOn) : valid(undefined);
        const validatedAcceptedTerms = acceptedTerms !== undefined ? validateAcceptedTerms(acceptedTerms) : valid(undefined);
        const validatedUserType = type !== undefined ? validateUserType(type) : valid(undefined);

        if (allValid([validatedUserId, validatedName, validatedEmail, validatedJobTitle, validatedAvatarImageFile, validatedNotificationsOn, validatedAcceptedTerms, validatedUserType])) {

          // Check for admin role, and if not own account, ensure only user id was provided (re-activation scenario) OR that the user type is being changed
          // Admin shouldn't provide any other updates to profile
          if (permissions.isAdmin(request.session) && !permissions.isOwnAccount(request.session, request.params.id)) {
            if (validatedName.value || validatedEmail.value || validatedJobTitle.value || validatedAvatarImageFile.value || validatedNotificationsOn.value || validatedAcceptedTerms.value) {
              return invalid({
                permissions: [permissions.ERROR_MESSAGE]
              });
            }

            // Admins can grant/revoke admin privileges for govt users (but not their own)
            if (validatedUserType.value) {
              if (validatedUserId.tag === 'valid' &&
                  validatedUserType.value !== UserType.Vendor &&
                  validatedUserId.value.type !== UserType.Vendor) {
                    return valid({
                      id: validatedUserId.value.id,
                      type: validatedUserType.value
                    });
                  } else {
                    return invalid({
                      permissions: [permissions.ERROR_MESSAGE]
                    });
                  }
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
            jobTitle: validatedJobTitle.value,
            avatarImageFile: getValidValue(mapValid(validatedAvatarImageFile, v => v && v.id), undefined),
            notificationsOn: validatedNotificationsOn.value,
            acceptedTerms: validatedAcceptedTerms.value
          });
        } else {
          return invalid({
            id: getInvalidValue(validatedUserId, undefined),
            name: getInvalidValue(validatedName, undefined),
            email: getInvalidValue(validatedEmail, undefined),
            jobTitle: getInvalidValue(validatedJobTitle, undefined),
            avatarImageFile: getInvalidValue(validatedAvatarImageFile, undefined),
            notificationsOn: getInvalidValue(validatedNotificationsOn, undefined),
            acceptedTerms: getInvalidValue(validatedAcceptedTerms, undefined)
          });
        }
      },
      async respond(request) {
        const respond = (code: number, body: User | UpdateValidationErrors) => basicResponse(code, request.session, makeJsonResponseBody(body));
        if (!permissions.updateUser(request.session, request.params.id)) {
          return respond(401, {
            permissions: [permissions.ERROR_MESSAGE]
          });
        }
        switch (request.body.tag) {
          case 'invalid':
            if (request.body.value.permissions) {
              return respond(401, request.body.value);
            }
            return respond(400, request.body.value);
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
        if (!permissions.deleteUser(request.session, id) || !request.session.user) {
          return respond(401, [permissions.ERROR_MESSAGE]);
        }
        // If this own account, then mark as deactivated by user, otherwise by admin
        // Track the date the user was made inactive, and the user id of the user that made them inactive
        const isOwnAccount = permissions.isOwnAccount(request.session, id);
        const status = isOwnAccount ? UserStatus.InactiveByUser : UserStatus.InactiveByAdmin;
        const updatedUser = await updateUser(connection, {
          id,
          status,
          deactivatedOn: new Date(),
          deactivatedBy: request.session.user.id
        });
        // Sign the user out of the current session if they are deactivating their own account.
        let session = request.session;
        if (isOwnAccount) {
          const result = await signOut(connection, session);
          if (result.tag === 'invalid') {
            session = await createAnonymousSession(connection);
          } else {
            session = result.value;
          }
        }
        return basicResponse(200, session, makeJsonResponseBody(updatedUser));
      }
    };
  }
};

export default resource;
