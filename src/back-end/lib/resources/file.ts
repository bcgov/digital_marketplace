import * as crud from "back-end/lib/crud";
import * as db from "back-end/lib/db";
import * as permissions from "back-end/lib/permissions";
import {
  basicResponse,
  FileResponseBody,
  FileUpload,
  JsonResponseBody,
  makeJsonResponseBody,
  nullRequestBodyHandler,
  wrapRespond
} from "back-end/lib/server";
import { FileUploadMetadata } from "back-end/lib/types";
import { validateFilePath } from "back-end/lib/validation";
import { lookup } from "mime-types";
import shajs from "sha.js";
import { getString } from "shared/lib";
import {
  CreateValidationErrors,
  FilePermissions,
  FileRecord
} from "shared/lib/resources/file";
import { Session } from "shared/lib/resources/session";
import { UserType } from "shared/lib/resources/user";
import { adt, Id } from "shared/lib/types";
import {
  allValid,
  getInvalidValue,
  invalid,
  isInvalid,
  valid,
  Validation
} from "shared/lib/validation";
import * as fileValidation from "shared/lib/validation/file";

export function hashFile(_originalName: string, data: Buffer): string {
  const hash = shajs("sha1");
  hash.update(data);
  return hash.digest("base64");
}

export type CreateRequestBody = FileUpload<FileUploadMetadata> | null;

export interface ValidatedCreateRequestBody
  extends Pick<FileUpload<FileUploadMetadata>, "name" | "path"> {
  permissions: Array<FilePermissions<Id, UserType>>;
}

const routeNamespace = "files";

const readOne: crud.ReadOne<Session, db.Connection> = (
  connection: db.Connection
) => {
  return nullRequestBodyHandler<
    FileResponseBody | JsonResponseBody<FileRecord | string[]>,
    Session | null
  >(async (request) => {
    const getBlob = getString(request.query, "type") === "blob";
    const respond = (code: number, body: FileRecord | string[]) =>
      basicResponse(code, request.session, makeJsonResponseBody(body));
    if (
      await permissions.readOneFile(
        connection,
        request.session,
        request.params.id
      )
    ) {
      const dbResult = await db.readOneFileById(connection, request.params.id);
      if (isInvalid(dbResult)) {
        return respond(503, [db.ERROR_MESSAGE]);
      }
      const file = dbResult.value;
      if (!file) {
        return respond(404, ["File not found."]);
      }
      if (!getBlob) {
        return respond(200, file);
      }
      const dbResultBlob = await db.readOneFileBlob(connection, file.fileBlob);
      if (isInvalid(dbResultBlob)) {
        return respond(503, [db.ERROR_MESSAGE]);
      }
      if (!dbResultBlob.value) {
        return respond(404, ["File not found."]);
      }
      return basicResponse(
        200,
        request.session,
        adt("file", {
          buffer: dbResultBlob.value.blob,
          contentType: lookup(file.name) || "application/octet-stream",
          contentDisposition: `attachment; filename="${file.name}"`
        })
      );
    }
    return respond(401, [permissions.ERROR_MESSAGE]);
  });
};

const create: crud.Create<
  Session,
  db.Connection,
  CreateRequestBody,
  ValidatedCreateRequestBody,
  CreateValidationErrors
> = (connection: db.Connection) => {
  return {
    async parseRequestBody(request): Promise<CreateRequestBody> {
      const body = request.body.tag === "file" ? request.body.value : null;
      if (body) {
        return {
          name: getString(body, "name"),
          metadata: body.metadata,
          path: getString(body, "path")
        };
      } else {
        return null;
      }
    },
    async validateRequestBody(
      request
    ): Promise<Validation<ValidatedCreateRequestBody, CreateValidationErrors>> {
      if (!request.body) {
        return invalid({
          requestBodyType: [
            "You need to submit a valid multipart request to create a file."
          ]
        });
      }
      if (!permissions.createFile(request.session)) {
        return invalid({
          permissions: [permissions.ERROR_MESSAGE]
        });
      }
      const { name, metadata, path } = request.body;
      const validatedOriginalFileName = fileValidation.validateFileName(name);
      const validatedFilePermissions = metadata
        ? valid(metadata)
        : invalid(["Invalid metadata provided."]);
      const validatedFilePath = validateFilePath(path);

      if (
        allValid([
          validatedOriginalFileName,
          validatedFilePermissions,
          validatedFilePath
        ])
      ) {
        return valid({
          name: validatedOriginalFileName.value,
          permissions: validatedFilePermissions.value,
          path: validatedFilePath.value
        } as ValidatedCreateRequestBody);
      } else {
        return invalid({
          name: getInvalidValue(validatedOriginalFileName, undefined),
          metadata: getInvalidValue(validatedFilePermissions, undefined),
          path: getInvalidValue(validatedFilePath, undefined)
        });
      }
    },
    respond: wrapRespond<
      ValidatedCreateRequestBody,
      CreateValidationErrors,
      JsonResponseBody<FileRecord>,
      JsonResponseBody<CreateValidationErrors>,
      Session
    >({
      valid: async (request) => {
        const createdById = getString(request.session?.user || {}, "id");
        const dbResult = await db.createFile(
          connection,
          request.body,
          createdById
        );
        if (isInvalid(dbResult)) {
          return basicResponse(
            503,
            request.session,
            makeJsonResponseBody({ database: [db.ERROR_MESSAGE] })
          );
        }
        return basicResponse(
          201,
          request.session,
          makeJsonResponseBody(dbResult.value)
        );
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
  create
};

export default resource;
