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

const routeNamespace = "users";

const exportContactList = (connection: db.Connection) => {
  return nullRequestBodyHandler<TextResponseBody, Session>(async (request) => {
    const respond = (code: number, body: string, headers = {}) => ({
      code,
      headers: {
        ...headers,
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=dm-contacts.csv"
      },
      session: request.session,
      body: makeTextResponseBody(body)
    });

    // Check admin permissions
    if (!permissions.isAdmin(request.session)) {
      return respond(401, permissions.ERROR_MESSAGE);
    }

    const userTypes = request.query.userTypes?.split(",") || [];
    const fields = request.query.fields?.split(",") || [];

    // Validate input parameters
    if (!userTypes.length) {
      return respond(400, "At least one user type must be specified");
    }

    if (!fields.length) {
      return respond(400, "At least one field must be specified");
    }

    // Validate user types
    const validUserTypes = ["gov", "vendor"];
    const invalidUserTypes = userTypes.filter(
      (type) => !validUserTypes.includes(type)
    );
    if (invalidUserTypes.length > 0) {
      return respond(
        400,
        `Invalid user type(s): ${invalidUserTypes.join(", ")}`
      );
    }

    // Validate fields
    const validFields = ["firstName", "lastName", "email", "organizationName"];
    const invalidFields = fields.filter(
      (field) => !validFields.includes(field)
    );
    if (invalidFields.length > 0) {
      return respond(400, `Invalid field(s): ${invalidFields.join(", ")}`);
    }

    try {
      let users: User[] = [];

      if (userTypes.includes("gov")) {
        const govUsers = await db.readManyUsersByRole(
          connection,
          UserType.Government,
          false
        );
        if (isValid(govUsers)) {
          users = [...users, ...govUsers.value];
        }
      }

      if (userTypes.includes("vendor")) {
        const vendorUsers = await db.readManyUsersByRole(
          connection,
          UserType.Vendor,
          false
        );
        if (isValid(vendorUsers)) {
          users = [...users, ...vendorUsers.value];
        }
      }

      const organizationsMap: Record<string, string> = {};
      if (fields.includes("organizationName") && userTypes.includes("vendor")) {
        const vendorUserIds = users
          .filter((user) => user.type === UserType.Vendor)
          .map((user) => user.id);

        for (const userId of vendorUserIds) {
          const affiliations = await db.readManyAffiliations(
            connection,
            userId
          );
          if (isValid(affiliations) && affiliations.value.length > 0) {
            const firstOrg = affiliations.value[0];
            if (firstOrg && firstOrg.organization) {
              organizationsMap[userId] = firstOrg.organization.legalName;
            }
          }
        }
      }

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

      for (const user of users) {
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
          const orgName = organizationsMap[user.id] || "";
          row.push(`"${orgName}"`);
        }

        csvContent += row.join(",") + "\n";
      }

      return respond(200, csvContent);
    } catch (error) {
      request.logger.error(
        "Error generating contact list CSV",
        error as object
      );
      return respond(
        500,
        "An error occurred while generating the contact list"
      );
    }
  });
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
  // create: null,
  update,
  delete: delete_
};

export default {
  ...resource,
  custom: {
    exportContactList
  }
};
