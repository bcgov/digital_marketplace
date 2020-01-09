import * as crud from 'back-end/lib/crud';
import { Connection, createAnonymousSession, readManyUsers, readOneUser, updateUser } from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import { signOut } from 'back-end/lib/resources/session';
import { basicResponse, JsonResponseBody, makeJsonResponseBody, nullRequestBodyHandler } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { validateUserId } from 'back-end/lib/validation';
import { isBoolean } from 'lodash';
import { getString } from 'shared/lib';
import { Session } from 'shared/lib/resources/session';
import { UpdateProfileRequestBody, UpdateRequestBody as SharedUpdateRequestBody, UpdateValidationErrors, User, UserStatus, UserType } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';
import { allValid, getInvalidValue, invalid, isInvalid, valid, Validation } from 'shared/lib/validation';
import * as userValidation from 'shared/lib/validation/user';

type UpdateRequestBody = SharedUpdateRequestBody | null;

type ValidatedUpdateRequestBody = SharedUpdateRequestBody | ADT<'updateNotifications', Date | null> | ADT<'updateAdminPermissions', UserType>;

type ValidatedUpdateProfileRequestBody = UpdateProfileRequestBody;

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
        return respond(401,  [permissions.ERROR_MESSAGE]);
      }
      return respond(200, validatedUser.value);
    });
  },

  update(connection) {
    return {
      async parseRequestBody(request): Promise<UpdateRequestBody | null> {
        const body = request.body.tag === 'json' ? request.body.value : {};
        switch (body.tag) {
          case 'updateProfile':
            return adt('updateProfile', {
              name: getString(body.value, 'name'),
              email: getString(body.value, 'email'),
              jobTitle: getString(body.value, 'jobTitle')
            });

          case 'acceptTerms':
            return adt('acceptTerms');

          case 'updateNotifications':
            if (isBoolean(body.value)) {
              return adt('updateNotifications', body.value);
            } else {
              return null;
            }

          case 'reactivateUser':
            return adt('reactivateUser');

          case 'updateAdminPermissions':
            if (isBoolean(body.value)) {
              return adt('updateAdminPermissions', body.value);
            } else {
              return null;
            }

          default:
            return null;
        }
      },
      async validateRequestBody(request): Promise<Validation<ValidatedUpdateRequestBody, UpdateValidationErrors>> {
        if (!request.body) { return invalid(adt('parseFailure')); }
        const validatedUser = await validateUserId(connection, request.params.id);
        if (isInvalid(validatedUser)) {
          return invalid(adt('userNotFound', ['The specified user does not exist.']));
        }
        switch (request.body.tag) {
          case 'updateProfile':
            const { name, email, jobTitle } = request.body.value;
            const validatedName = userValidation.validateName(name);
            const validatedEmail = userValidation.validateEmail(email);
            const validatedJobTitle = userValidation.validateJobTitle(jobTitle);

            if (allValid([validatedName, validatedEmail, validatedJobTitle])) {
              if (!permissions.updateUser(request.session, request.params.id)) {
                return invalid(adt('permissions', [permissions.ERROR_MESSAGE]));
              }
              return valid(adt('updateProfile', {
                name: validatedName.value,
                email: validatedEmail.value,
                jobTitle: validatedJobTitle.value
              } as ValidatedUpdateProfileRequestBody));
            } else {
              return invalid(adt('updateProfile', {
                name: getInvalidValue(validatedName, undefined),
                email: getInvalidValue(validatedEmail, undefined),
                jobTitle: getInvalidValue(validatedJobTitle, undefined)
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
            const validatedNotificationsOn = userValidation.validateNotificationsOn(request.body.value);
            if (!permissions.updateUser(request.session, request.params.id)) {
              return invalid(adt('permissions', [permissions.ERROR_MESSAGE]));
            }
            if (isInvalid(validatedNotificationsOn)) {
              return invalid(adt('parseFailure'));
            }
            return valid(adt('updateNotifications', validatedNotificationsOn.value));

          case 'reactivateUser':
            if (!permissions.reactivateUser(request.session, request.params.id) || validatedUser.value.status !== UserStatus.InactiveByAdmin) {
              return invalid(adt('permissions', [permissions.ERROR_MESSAGE]));
            }
            return valid(adt('reactivateUser'));

          case 'updateAdminPermissions':
            const validatedAdminStatus = userValidation.validateAdminStatus(request.body.value);
            if (!permissions.updateAdminStatus(request.session)) {
              return invalid(adt('permissions', [permissions.ERROR_MESSAGE]));
            }
            if (validatedUser.value.type === UserType.Vendor) {
              return invalid(adt('updateAdminPermissions', ['Vendors cannot be granted admin permissions.']));
            }
            if (isInvalid(validatedAdminStatus)) {
             return invalid(adt('parseFailure'));
            }
            return valid(adt('updateAdminPermissions', validatedAdminStatus.value));

          default:
            return invalid(adt('parseFailure')); // Unsure if this is the correct ADT to return as default - open to suggestions
        }
      },
      async respond(request) {
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
          let updatedUser: User;
          switch (request.body.value.tag) {
            case 'updateProfile':
              updatedUser = await updateUser(connection, {...request.body.value.value, id: request.params.id });
              break;
            case 'acceptTerms':
              updatedUser = await updateUser(connection, { acceptedTerms: new Date(), id: request.params.id });
              break;
            case 'updateNotifications':
              updatedUser = await updateUser(connection, { notificationsOn: new Date(), id: request.params.id });
              break;
            case 'reactivateUser':
              updatedUser = await updateUser(connection, { status: UserStatus.Active, id: request.params.id });
              break;
            case 'updateAdminPermissions':
              updatedUser = await updateUser(connection, { type: request.body.value.value as UserType, id: request.params.id });
          }
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
