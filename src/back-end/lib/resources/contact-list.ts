import * as crud from "back-end/lib/crud";
import * as db from "back-end/lib/db";
import * as permissions from "back-end/lib/permissions";
import {
  basicResponse,
  FileResponseBody,
  JsonResponseBody,
  makeJsonResponseBody,
  nullRequestBodyHandler
} from "back-end/lib/server";
import { Session } from "shared/lib/resources/session";
import { UserType, userTypeToTitleCase } from "shared/lib/resources/user";
import { adt } from "shared/lib/types";
import { isValid } from "shared/lib/validation";
import { getString } from "shared/lib";
import {
  validateContactListExportParams,
  ExportContactListValidationErrors
} from "back-end/lib/validation";

const routeNamespace = "contact-list";

const readMany: crud.ReadMany<Session, db.Connection> = (
  connection: db.Connection
) => {
  return nullRequestBodyHandler<
    FileResponseBody | JsonResponseBody<ExportContactListValidationErrors>,
    Session
  >(async (request) => {
    const respond = (code: number, body: ExportContactListValidationErrors) =>
      basicResponse(code, request.session, makeJsonResponseBody(body));

    // Check admin permissions
    if (!permissions.isAdmin(request.session)) {
      return respond(401, {
        permissions: [permissions.ERROR_MESSAGE]
      });
    }

    // Parse query parameters
    const userTypesParam = getString(request.query, "userTypes");
    const fieldsParam = getString(request.query, "fields");

    const userTypes = userTypesParam
      ? userTypesParam.split(",").filter((type) => type.trim() !== "")
      : [];
    const fields = fieldsParam
      ? fieldsParam.split(",").filter((field) => field.trim() !== "")
      : [];

    // Validate input parameters using the new validation functions
    const validationResult = validateContactListExportParams(userTypes, fields);

    if (!isValid(validationResult)) {
      return respond(400, validationResult.value);
    }

    const { userTypes: validatedUserTypes, fields: validatedFields } =
      validationResult.value;

    try {
      const userTypesToFetch: UserType[] = [];
      if (validatedUserTypes.includes(UserType.Government)) {
        userTypesToFetch.push(UserType.Government, UserType.Admin);
      }
      if (validatedUserTypes.includes(UserType.Vendor)) {
        userTypesToFetch.push(UserType.Vendor);
      }

      const usersWithOrganizations = await db.readManyUsersWithOrganizations(
        connection,
        userTypesToFetch,
        false
      );

      const headerRow: string[] = [];

      if (validatedFields.includes("firstName")) headerRow.push("First Name");
      if (validatedFields.includes("lastName")) headerRow.push("Last Name");
      if (validatedFields.includes("email")) headerRow.push("Email");

      // Add User Type column if both Government and Vendor types are selected
      const includeUserType =
        validatedUserTypes.includes(UserType.Government) &&
        validatedUserTypes.includes(UserType.Vendor);
      if (includeUserType) headerRow.push("User Type");

      if (validatedFields.includes("organizationName"))
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

          if (validatedFields.includes("firstName")) row.push(`"${firstName}"`);
          if (validatedFields.includes("lastName")) row.push(`"${lastName}"`);
          if (validatedFields.includes("email"))
            row.push(`"${user.email || ""}"`);

          // Add user type if both Government and Vendor types are selected
          if (includeUserType) {
            const userTypeLabel =
              user.type === UserType.Admin
                ? "Admin"
                : userTypeToTitleCase(user.type);
            row.push(`"${userTypeLabel}"`);
          }

          if (validatedFields.includes("organizationName")) {
            const orgNamesString =
              userWithOrgs.organizationNames.length > 0
                ? userWithOrgs.organizationNames.join("; ")
                : "";
            row.push(`"${orgNamesString}"`);
          }

          csvContent += row.join(",") + "\n";
        }
      }

      return basicResponse(
        200,
        request.session,
        adt("file", {
          buffer: Buffer.from(csvContent, "utf-8"),
          contentType: "text/csv",
          contentDisposition: "attachment; filename=dm-contacts.csv"
        })
      );
    } catch (error) {
      request.logger.error(
        "Error generating contact list CSV",
        error as object
      );
      return respond(500, {
        permissions: ["An error occurred while generating the contact list"]
      });
    }
  });
};

const resource: crud.BasicCrudResource<Session, db.Connection> = {
  routeNamespace,
  readMany
};

export default resource;
