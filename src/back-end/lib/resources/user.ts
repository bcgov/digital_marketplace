import * as crud from "back-end/lib/crud";
import * as db from "back-end/lib/db";
import * as userNotifications from "back-end/lib/mailer/notifications/user";
import * as permissions from "back-end/lib/permissions";
import { signOut } from "back-end/lib/resources/session";
import {
  basicResponse,
  JsonResponseBody,
  makeJsonResponseBody,
  TextResponseBody,
  makeTextResponseBody,
  nullRequestBodyHandler,
  wrapRespond
} from "back-end/lib/server";
import { ServerHttpMethod } from "back-end/lib/types";
import {
  SupportedRequestBodies as DefaultSupportedRequestBodies,
  SupportedResponseBodies as DefaultSupportedResponseBodies
} from "back-end/lib/types";
import { validateFileRecord, validateUserId } from "back-end/lib/validation";
import { get, isBoolean } from "lodash";
import { getString } from "shared/lib";
import { Session } from "shared/lib/resources/session";
import {
  adminPermissionsToUserType,
  DeleteValidationErrors,
  notificationsBooleanToNotificationsOn,
  UpdateProfileRequestBody,
  UpdateRequestBody as SharedUpdateRequestBody,
  UpdateValidationErrors,
  User,
  UserStatus,
  UserType
} from "shared/lib/resources/user";
import { adt, ADT } from "shared/lib/types";
import {
  allValid,
  getInvalidValue,
  invalid,
  isInvalid,
  isValid,
  optionalAsync,
  valid,
  Validation
} from "shared/lib/validation";
import * as userValidation from "shared/lib/validation/user";
import { isArray } from "lodash";

export type UpdateRequestBody = SharedUpdateRequestBody | null;

export type ValidatedUpdateRequestBody =
  | ADT<"updateProfile", UpdateProfileRequestBody>
  | ADT<"updateCapabilities", string[]>
  | ADT<"acceptTerms">
  | ADT<"updateNotifications", Date | null>
  | ADT<"reactivateUser">
  | ADT<"updateAdminPermissions", UserType>;

type DeleteValidatedReqBody = User;

// Add validation error types for export contact list
export interface ExportContactListValidationErrors {
  userTypes?: string[];
  fields?: string[];
  permissions?: string[];
}

// Add request body types for export contact list
export interface ExportContactListRequestBody {
  userTypes: string[];
  fields: string[];
}

const routeNamespace = "users";

const exportContactList: crud.CustomRoute<
  DefaultSupportedRequestBodies,
  DefaultSupportedResponseBodies,
  Session,
  db.Connection
> = (connection: db.Connection) => {
  return {
    method: ServerHttpMethod.Get,
    path: "/export-contact-list",
    handler: {
      async parseRequestBody(request) {
        const userTypes = request.query.userTypes?.split(",") || [];
        const fields = request.query.fields?.split(",") || [];

        return {
          userTypes,
          fields
        } as ExportContactListRequestBody;
      },
      async validateRequestBody(request) {
        // Check admin permissions
        if (!permissions.isAdmin(request.session)) {
          return invalid({
            permissions: [permissions.ERROR_MESSAGE]
          });
        }

        const { userTypes, fields } = request.body;

        // Validate input parameters
        if (!userTypes.length) {
          return invalid({
            userTypes: ["At least one user type must be specified"]
          });
        }

        if (!fields.length) {
          return invalid({
            fields: ["At least one field must be specified"]
          });
        }

        // Validate user types
        const validUserTypes = ["gov", "vendor"];
        const invalidUserTypes = userTypes.filter(
          (type: string) => !validUserTypes.includes(type)
        );
        if (invalidUserTypes.length > 0) {
          return invalid({
            userTypes: [`Invalid user type(s): ${invalidUserTypes.join(", ")}`]
          });
        }

        // Validate fields
        const validFields = [
          "firstName",
          "lastName",
          "email",
          "organizationName"
        ];
        const invalidFields = fields.filter(
          (field: string) => !validFields.includes(field)
        );
        if (invalidFields.length > 0) {
          return invalid({
            fields: [`Invalid field(s): ${invalidFields.join(", ")}`]
          });
        }

        return valid(request.body);
      },
      respond: wrapRespond<
        ExportContactListRequestBody,
        ExportContactListValidationErrors,
        TextResponseBody,
        JsonResponseBody<ExportContactListValidationErrors>,
        Session
      >({
        valid: async (request) => {
          try {
            const { userTypes, fields } = request.body;

            // Use the new optimized function to get users with their organizations
            const userTypesToFetch: UserType[] = [];
            if (userTypes.includes("gov")) {
              userTypesToFetch.push(UserType.Government, UserType.Admin);
            }
            if (userTypes.includes("vendor")) {
              userTypesToFetch.push(UserType.Vendor);
            }

            const usersWithOrganizations =
              await db.readManyUsersWithOrganizations(
                connection,
                userTypesToFetch,
                false
              );

            const headerRow: string[] = [];

            if (fields.includes("firstName")) headerRow.push("First Name");
            if (fields.includes("lastName")) headerRow.push("Last Name");
            if (fields.includes("email")) headerRow.push("Email");

            // Add User Type column if both gov and vendor types are selected
            const includeUserType =
              userTypes.includes("gov") && userTypes.includes("vendor");
            if (includeUserType) headerRow.push("User Type");

            if (fields.includes("organizationName"))
              headerRow.push("Organization Name");

            let csvContent = headerRow.join(",") + "\n";

            if (isValid(usersWithOrganizations)) {
              for (const userWithOrgs of usersWithOrganizations.value) {
                const user = userWithOrgs.user;
                const row: string[] = [];

                const nameParts = (user.name || "").split(" ");
                const firstName = nameParts[0] || "";
                const lastName =
                  nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

                if (fields.includes("firstName")) row.push(`"${firstName}"`);
                if (fields.includes("lastName")) row.push(`"${lastName}"`);
                if (fields.includes("email")) row.push(`"${user.email || ""}"`);

                // Add user type if both gov and vendor types are selected
                if (includeUserType) {
                  const userTypeLabel =
                    user.type === UserType.Government
                      ? "Government"
                      : user.type === UserType.Vendor
                      ? "Vendor"
                      : "Admin";
                  row.push(`"${userTypeLabel}"`);
                }

                if (fields.includes("organizationName")) {
                  const orgNamesString =
                    userWithOrgs.organizationNames.length > 0
                      ? userWithOrgs.organizationNames.join("; ")
                      : "";
                  row.push(`"${orgNamesString}"`);
                }

                csvContent += row.join(",") + "\n";
              }
            }

            return {
              code: 200,
              headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": "attachment; filename=dm-contacts.csv"
              },
              session: request.session,
              body: makeTextResponseBody(csvContent)
            };
          } catch (error) {
            request.logger.error(
              "Error generating contact list CSV",
              error as object
            );
            return {
              code: 500,
              headers: {},
              session: request.session,
              body: makeTextResponseBody(
                "An error occurred while generating the contact list"
              )
            };
          }
        },
        invalid: async (request) => {
          return basicResponse(
            400,
            request.session,
            makeJsonResponseBody(request.body)
          );
        }
      })
    }
  };
};

const readOne: crud.ReadOne<Session, db.Connection> = (
  connection: db.Connection
) => {
  return nullRequestBodyHandler<JsonResponseBody<User | string[]>, Session>(
    async (request) => {
      const respond = (code: number, body: User | string[]) =>
        basicResponse(code, request.session, makeJsonResponseBody(body));
      const validatedUser = await validateUserId(connection, request.params.id);
      if (isInvalid(validatedUser)) {
        return respond(400, validatedUser.value);
      }
      if (!permissions.readOneUser(request.session, validatedUser.value.id)) {
        return respond(401, [permissions.ERROR_MESSAGE]);
      }
      return respond(200, validatedUser.value);
    }
  );
};

const readMany: crud.ReadMany<Session, db.Connection> = (
  connection: db.Connection
) => {
  return nullRequestBodyHandler<JsonResponseBody<User[] | string[]>, Session>(
    async (request) => {
      const respond = (code: number, body: User[] | string[]) =>
        basicResponse(code, request.session, makeJsonResponseBody(body));
      if (!permissions.readManyUsers(request.session)) {
        return respond(401, [permissions.ERROR_MESSAGE]);
      }
      const dbResult = await db.readManyUsers(connection);
      if (isValid(dbResult)) {
        return respond(200, dbResult.value);
      } else {
        return respond(503, [db.ERROR_MESSAGE]);
      }
    }
  );
};

const update: crud.Update<
  Session,
  db.Connection,
  UpdateRequestBody,
  ValidatedUpdateRequestBody,
  UpdateValidationErrors
> = (connection: db.Connection) => {
  return {
    async parseRequestBody(request) {
      const body = request.body.tag === "json" ? request.body.value : {};
      const tag = getString(body, "tag");
      const value: unknown = get(body, "value");
      switch (tag) {
        case "updateProfile":
          return adt("updateProfile", {
            name: getString(value, "name"),
            email: getString(value, "email"),
            jobTitle: getString(value, "jobTitle"),
            avatarImageFile: getString(value, "avatarImageFile") || undefined
          });

        case "updateCapabilities":
          if (isArray(value)) {
            return adt("updateCapabilities", value);
          } else {
            return null;
          }

        case "acceptTerms":
          return adt("acceptTerms");

        case "updateNotifications":
          if (isBoolean(value)) {
            return adt("updateNotifications", value);
          } else {
            return null;
          }

        case "reactivateUser":
          return adt("reactivateUser");

        case "updateAdminPermissions":
          if (isBoolean(value)) {
            return adt("updateAdminPermissions", value);
          } else {
            return null;
          }

        default:
          return null;
      }
    },
    async validateRequestBody(request) {
      if (!request.body) {
        return invalid({ user: adt("parseFailure" as const) });
      }
      const validatedUser = await validateUserId(connection, request.params.id);
      if (isInvalid(validatedUser)) {
        return invalid({ notFound: ["The specified user does not exist."] });
      }
      switch (request.body.tag) {
        case "updateProfile": {
          const { name, email, jobTitle, avatarImageFile } = request.body.value;
          const validatedName = userValidation.validateName(name);
          const validatedEmail = userValidation.validateEmail(email);
          const validatedJobTitle = userValidation.validateJobTitle(jobTitle);
          const validatedAvatarImageFile = await optionalAsync(
            avatarImageFile,
            (v) => validateFileRecord(connection, v)
          );

          if (
            allValid([
              validatedName,
              validatedEmail,
              validatedJobTitle,
              validatedAvatarImageFile
            ])
          ) {
            if (!permissions.updateUser(request.session, request.params.id)) {
              return invalid({ permissions: [permissions.ERROR_MESSAGE] });
            }
            return valid(
              adt(
                "updateProfile" as const,
                {
                  name: validatedName.value,
                  email: validatedEmail.value,
                  jobTitle: validatedJobTitle.value,
                  avatarImageFile:
                    isValid(validatedAvatarImageFile) &&
                    validatedAvatarImageFile.value &&
                    validatedAvatarImageFile.value.id
                } as UpdateProfileRequestBody
              )
            );
          } else {
            return invalid({
              user: adt("updateProfile" as const, {
                name: getInvalidValue(validatedName, undefined),
                email: getInvalidValue(validatedEmail, undefined),
                jobTitle: getInvalidValue(validatedJobTitle, undefined),
                avatarImageFile: getInvalidValue(
                  validatedAvatarImageFile,
                  undefined
                )
              })
            });
          }
        }

        case "updateCapabilities": {
          if (!permissions.updateUser(request.session, request.params.id)) {
            return invalid({ permissions: [permissions.ERROR_MESSAGE] });
          }
          const validatedCapabilities = userValidation.validateCapabilities(
            request.body.value
          );
          if (isValid<string[]>(validatedCapabilities)) {
            return valid(
              adt("updateCapabilities" as const, validatedCapabilities.value)
            );
          } else {
            return invalid({
              user: adt(
                "updateCapabilities" as const,
                getInvalidValue(validatedCapabilities, []) as string[][]
              )
            });
          }
        }

        case "acceptTerms":
          if (!permissions.acceptTerms(request.session, request.params.id)) {
            return invalid({ permissions: [permissions.ERROR_MESSAGE] });
          }
          //Allow users to accept the terms if they have already accepted them.
          return valid(adt("acceptTerms" as const));

        case "updateNotifications":
          if (!permissions.updateUser(request.session, request.params.id)) {
            return invalid({ permissions: [permissions.ERROR_MESSAGE] });
          }
          return valid(
            adt(
              "updateNotifications" as const,
              notificationsBooleanToNotificationsOn(request.body.value)
            )
          );

        case "reactivateUser":
          if (
            !permissions.reactivateUser(request.session, request.params.id) ||
            validatedUser.value.status !== UserStatus.InactiveByAdmin
          ) {
            return invalid({ permissions: [permissions.ERROR_MESSAGE] });
          }
          return valid(adt("reactivateUser" as const));

        case "updateAdminPermissions": {
          const userType = adminPermissionsToUserType(request.body.value);
          if (!permissions.updateAdminStatus(request.session)) {
            return invalid({ permissions: [permissions.ERROR_MESSAGE] });
          }
          if (validatedUser.value.type === UserType.Vendor) {
            return invalid({
              user: adt("updateAdminPermissions" as const, [
                "Vendors cannot be granted admin permissions."
              ])
            });
          }
          return valid(adt("updateAdminPermissions" as const, userType));
        }

        default:
          return invalid({ user: adt("parseFailure" as const) });
      }
    },
    respond: wrapRespond({
      valid: async (request) => {
        let dbResult: Validation<User, null>;
        switch (request.body.tag) {
          case "updateProfile":
            dbResult = await db.updateUser(connection, {
              ...request.body.value,
              id: request.params.id
            });
            break;
          case "updateCapabilities":
            dbResult = await db.updateUser(connection, {
              capabilities: request.body.value,
              id: request.params.id
            });
            break;
          case "acceptTerms": {
            const currentDate = new Date();
            dbResult = await db.updateUser(connection, {
              acceptedTermsAt: currentDate,
              lastAcceptedTermsAt: currentDate,
              id: request.params.id
            });
            break;
          }
          case "updateNotifications":
            dbResult = await db.updateUser(connection, {
              notificationsOn: request.body.value,
              id: request.params.id
            });
            break;
          case "reactivateUser":
            dbResult = await db.updateUser(connection, {
              status: UserStatus.Active,
              id: request.params.id
            });
            if (isValid(dbResult)) {
              userNotifications.accountReactivatedSelf(dbResult.value);
            }
            break;
          case "updateAdminPermissions":
            dbResult = await db.updateUser(connection, {
              type: request.body.value,
              id: request.params.id
            });
        }
        switch (dbResult.tag) {
          case "valid":
            return basicResponse(
              200,
              request.session,
              makeJsonResponseBody(dbResult.value)
            );
          case "invalid":
            return basicResponse(
              503,
              request.session,
              makeJsonResponseBody({ database: [db.ERROR_MESSAGE] })
            );
        }
      },
      invalid: async (request) => {
        return basicResponse(
          400,
          request.session,
          makeJsonResponseBody(request.body)
        );
      }
    })
  };
};

const delete_: crud.Delete<
  Session,
  db.Connection,
  DeleteValidatedReqBody,
  DeleteValidationErrors
> = (connection: db.Connection) => {
  return {
    async validateRequestBody(request) {
      const validatedUser = await validateUserId(connection, request.params.id);
      if (isInvalid(validatedUser)) {
        return invalid({ notFound: ["Specified user not found."] });
      }
      if (validatedUser.value.status !== UserStatus.Active) {
        return invalid({ user: ["Specified user is already inactive"] });
      }
      if (!permissions.deleteUser(request.session, validatedUser.value.id)) {
        return invalid({ permissions: [permissions.ERROR_MESSAGE] });
      }
      return valid(validatedUser.value);
    },
    respond: wrapRespond({
      valid: async (request) => {
        // Track the date the user was made inactive, and the user id of the user that made them inactive
        const isOwnAccount = permissions.isOwnAccount(
          request.session,
          request.params.id
        );
        const status = isOwnAccount
          ? UserStatus.InactiveByUser
          : UserStatus.InactiveByAdmin;
        const deactivatingUserId = request.session
          ? request.session.user.id
          : undefined;
        const dbResult = await db.updateUser(connection, {
          id: request.params.id,
          status,
          deactivatedOn: new Date(),
          deactivatedBy: deactivatingUserId
        });

        if (isValid(dbResult)) {
          // Sign the user out of the current session if they are deactivating their own account.
          let session = request.session;
          if (isOwnAccount) {
            userNotifications.accountDeactivatedSelf(dbResult.value);
            await signOut(connection, session);
            session = null;
          } else {
            userNotifications.accountDeactivatedAdmin(dbResult.value);
          }
          return basicResponse(
            200,
            session,
            makeJsonResponseBody(dbResult.value)
          );
        } else {
          return basicResponse(
            503,
            request.session,
            makeJsonResponseBody({ database: [db.ERROR_MESSAGE] })
          );
        }
      },
      invalid: async (request) => {
        return basicResponse(
          400,
          request.session,
          makeJsonResponseBody(request.body)
        );
      }
    })
  };
};

const resource: crud.BasicCrudResource<Session, db.Connection> = {
  routeNamespace,
  readOne,
  readMany,
  update,
  delete: delete_,
  custom: [exportContactList]
};

export default resource;
