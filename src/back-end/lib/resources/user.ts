import * as crud from 'back-end/lib/crud';
import { Connection, createAnonymousSession, readManyUsers, updateUser } from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import { signOut } from 'back-end/lib/resources/session';
import { Response } from 'back-end/lib/server';
import { basicResponse, JsonResponseBody, makeJsonResponseBody, nullRequestBodyHandler } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { validateImageFile, validateUserId } from 'back-end/lib/validation';
import { get, isBoolean } from 'lodash';
import { getString } from 'shared/lib';
import { Session } from 'shared/lib/resources/session';
import { DeleteValidationErrors } from 'shared/lib/resources/user';
import { adminPermissionsToUserType, parseNotificationsFlag, UpdateProfileRequestBody, UpdateRequestBody as SharedUpdateRequestBody, UpdateValidationErrors, User, UserStatus, UserType } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';
import { allValid, getInvalidValue, getValidValue, invalid, isInvalid, isValid, optionalAsync, valid } from 'shared/lib/validation';
import { DatabaseValidation } from 'shared/lib/validation/db';
import * as userValidation from 'shared/lib/validation/user';

type UpdateRequestBody = SharedUpdateRequestBody | null;

export type ValidatedUpdateRequestBody = SharedUpdateRequestBody | ADT<'updateNotifications', Date | null> | ADT<'updateAdminPermissions', UserType>;

type ValidatedUpdateProfileRequestBody = UpdateProfileRequestBody;

type DeleteValidatedReqBody = User;

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
  DeleteValidationErrors,
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
      const dbResult = await readManyUsers(connection);
      if (isValid(dbResult)) {
        return respond(200, dbResult.value);
      } else {
        return respond(503, ['Database error']);
      }
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
        return respond(401,  [permissions.ERROR_MESSAGE]);
      }
      return respond(200, validatedUser.value);
    });
  },

  update(connection) {
    return {
      async parseRequestBody(request) {
        const body = request.body.tag === 'json' ? request.body.value : {};
        const tag = getString(body, 'tag');
        const value: unknown = get(body, 'value');
        switch (tag) {
          case 'updateProfile':
            return adt('updateProfile', {
              name: getString(value, 'name'),
              email: getString(value, 'email'),
              jobTitle: getString(value, 'jobTitle'),
              avatarImageFile: getString(value, 'avatarImageFile')
            });

          case 'acceptTerms':
            return adt('acceptTerms');

          case 'updateNotifications':
            if (isBoolean(value)) {
              return adt('updateNotifications', value);
            } else {
              return null;
            }

          case 'reactivateUser':
            return adt('reactivateUser');

          case 'updateAdminPermissions':
            if (isBoolean(value)) {
              return adt('updateAdminPermissions', value);
            } else {
              return null;
            }

          default:
            return null;
        }
      },
      async validateRequestBody(request) {
        if (!request.body) { return invalid(adt('parseFailure')); }
        const validatedUser = await validateUserId(connection, request.params.id);
        if (isInvalid(validatedUser)) {
          return invalid(adt('userNotFound', ['The specified user does not exist.']));
        }
        switch (request.body.tag) {
          case 'updateProfile':
            const { name, email, jobTitle, avatarImageFile } = request.body.value;
            const validatedName = userValidation.validateName(name);
            const validatedEmail = userValidation.validateEmail(email);
            const validatedJobTitle = userValidation.validateJobTitle(jobTitle);
            const validatedAvatarImageFile = await optionalAsync(avatarImageFile, v => validateImageFile(connection, v));

            if (allValid([validatedName, validatedEmail, validatedJobTitle, validatedAvatarImageFile])) {
              if (!permissions.updateUser(request.session, request.params.id)) {
                return invalid(adt('permissions', [permissions.ERROR_MESSAGE]));
              }
              return valid(adt('updateProfile', {
                name: validatedName.value,
                email: validatedEmail.value,
                jobTitle: validatedJobTitle.value,
                avatarImageFile: isValid(validatedAvatarImageFile) && validatedAvatarImageFile.value && validatedAvatarImageFile.value.id
              } as ValidatedUpdateProfileRequestBody));
            } else {
              return invalid(adt('updateProfile', {
                name: getInvalidValue(validatedName, undefined),
                email: getInvalidValue(validatedEmail, undefined),
                jobTitle: getInvalidValue(validatedJobTitle, undefined),
                avatarImageFile: getInvalidValue(validatedAvatarImageFile, undefined)
              }));
            }

          case 'acceptTerms':
            if (!permissions.acceptTerms(request.session, request.params.id)) {
              return invalid(adt('permissions', [permissions.ERROR_MESSAGE]));
            }
            if (validatedUser.value.acceptedTerms) {
              return invalid(adt('acceptTerms', ['You have already accepted the terms of service.']));
            }
            return valid(adt('acceptTerms'));

          case 'updateNotifications':
            const notifications = parseNotificationsFlag(request.body.value);
            if (!permissions.updateUser(request.session, request.params.id)) {
              return invalid(adt('permissions', [permissions.ERROR_MESSAGE]));
            }
            return valid(adt('updateNotifications', notifications));

          case 'reactivateUser':
            if (!permissions.reactivateUser(request.session, request.params.id) || validatedUser.value.status !== UserStatus.InactiveByAdmin) {
              return invalid(adt('permissions', [permissions.ERROR_MESSAGE]));
            }
            return valid(adt('reactivateUser'));

          case 'updateAdminPermissions':
            const userType = adminPermissionsToUserType(request.body.value);
            if (!permissions.updateAdminStatus(request.session)) {
              return invalid(adt('permissions', [permissions.ERROR_MESSAGE]));
            }
            if (validatedUser.value.type === UserType.Vendor) {
              return invalid(adt('updateAdminPermissions', ['Vendors cannot be granted admin permissions.']));
            }
            return valid(adt('updateAdminPermissions', userType));

          default:
            return invalid(adt('parseFailure')); // Unsure if this is the correct ADT to return as default - open to suggestions
        }
      },
      async respond(request): Promise<Response<JsonResponseBody<User | UpdateValidationErrors>, Session>> {
        const respond = (code: number, body: User | UpdateValidationErrors) => basicResponse(code, request.session, makeJsonResponseBody(body));
        if (isInvalid(request.body)) {
            switch (request.body.value.tag) {
              case 'permissions':
                return respond(401, request.body.value);
              case 'userNotFound':
                return respond(404, request.body.value);
              default:
                return respond(400, request.body.value);
            }
        } else {
          let dbResult: DatabaseValidation<User>;
          switch (request.body.value.tag) {
            case 'updateProfile':
              dbResult = await updateUser(connection, {...request.body.value.value, id: request.params.id });
              break;
            case 'acceptTerms':
              dbResult = await updateUser(connection, { acceptedTerms: new Date(), id: request.params.id });
              break;
            case 'updateNotifications':
              dbResult = await updateUser(connection, { notificationsOn: new Date(), id: request.params.id });
              break;
            case 'reactivateUser':
              dbResult = await updateUser(connection, { status: UserStatus.Active, id: request.params.id });
              break;
            case 'updateAdminPermissions':
              dbResult = await updateUser(connection, { type: request.body.value.value as UserType, id: request.params.id });
          }
          switch (dbResult.tag) {
            case 'valid':
              return respond(200, dbResult.value);
            case 'invalid':
              return respond(503, dbResult.value);
          }
        }
      }
    };
  },

  delete(connection) {
    return {
      async validateRequestBody(request) {
        const validatedUser = await validateUserId(connection, request.params.id);
        if (isInvalid(validatedUser)) {
          return invalid(adt('userNotFound' as const, ['Specified user not found.']));
        }
        if (validatedUser.value.status !== UserStatus.Active) {
          return invalid(adt('userNotActive' as const, ['Specified user is already inactive']));
        }
        if (!permissions.deleteUser(request.session, validatedUser.value.id)) {
          return invalid(adt('permissions' as const, [permissions.ERROR_MESSAGE]));
        }
        return valid(validatedUser.value);
      },
      async respond(request): Promise<Response<JsonResponseBody<User | DeleteValidationErrors>, Session>> {
        const respond = (code: number, session: Session, body: User | DeleteValidationErrors) => basicResponse(code, session, makeJsonResponseBody(body));
        if (isInvalid(request.body)) {
          switch (request.body.value.tag) {
            case 'userNotFound':
              return respond(404, request.session, request.body.value);
            case 'permissions':
              return respond(401, request.session, request.body.value);
            default:
              return respond(400, request.session, request.body.value);
          }
        } else {
          // Track the date the user was made inactive, and the user id of the user that made them inactive
          const isOwnAccount = permissions.isOwnAccount(request.session, request.params.id);
          const status = isOwnAccount ? UserStatus.InactiveByUser : UserStatus.InactiveByAdmin;
          const deactivatingUserId = request.session.user ? request.session.user.id : undefined;
          const dbResult = await updateUser(connection, {
            id: request.params.id,
            status,
            deactivatedOn: new Date(),
            deactivatedBy: deactivatingUserId
          });

          switch (dbResult.tag) {
            case 'valid':
              // Sign the user out of the current session if they are deactivating their own account.
              let session = request.session;
              if (isOwnAccount) {
                const result = await signOut(connection, session);
                if (isInvalid(result)) {
                  const dbResult = await createAnonymousSession(connection);
                  session = isValid(dbResult) ? getValidValue(dbResult, session) : session;
                } else {
                  session = result.value;
                }
              }
              return respond(200, session, dbResult.value);

            case 'invalid':
              return respond(503, request.session, dbResult.value);
          }
        }
      }
    };
  }
};

export default resource;
