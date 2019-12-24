import * as crud from 'back-end/lib/crud';
import { Connection, createFile, readOneFileByHash, readOneFileById } from 'back-end/lib/db';
import { hashFile } from 'back-end/lib/fileUtils';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, JsonResponseBody, makeJsonResponseBody, nullRequestBodyHandler } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { CreateRequestBody, CreateValidationErrors, FilePermissions, FileRecord } from 'shared/lib/resources/file';
import { Session } from 'shared/lib/resources/session';
import { UserType } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';
import { allValid, getInvalidValue, invalid, valid } from 'shared/lib/validation';
import { validateFileName } from 'shared/lib/validation/file';

export interface ValidatedCreateRequestBody extends Omit<CreateRequestBody, 'id' | 'createdAt' | 'createdBy' | 'metadata'> {
  fileHash: string;
  permissions: Array<FilePermissions<Id, UserType>>;
}

type Resource = crud.Resource<
  SupportedRequestBodies,
  SupportedResponseBodies,
  CreateRequestBody,
  ValidatedCreateRequestBody,
  CreateValidationErrors,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  Session,
  Connection
>;

const resource: Resource = {
  routeNamespace: 'files',

  readOne(connection) {
    return nullRequestBodyHandler<JsonResponseBody<FileRecord | string[]>, Session>(async request => {
      const respond = (code: number, body: FileRecord | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
      if (await permissions.readOneFile(connection, request.session, request.params.id)) {
        const file = await readOneFileById(connection, request.params.id);
        return respond(200, file);
      }
      return respond(401, [permissions.ERROR_MESSAGE]);
    });
  },

  create(connection) {
    return {
      parseRequestBody(request) {
        return request.body.value;
      },
      async validateRequestBody(request) {
        const { name, metadata, path } = request.body;

        const validatedOriginalFileName = name ? validateFileName(name) : invalid(['File name must be provided']);
        let validatedFilePermissions;
        const filePerms: Array<FilePermissions<Id, UserType>> | null  = metadata || null;
        if (!filePerms) {
          validatedFilePermissions = invalid(['Invalid metadata provided.']);
        } else {
          validatedFilePermissions = valid(filePerms);
        }

        if (allValid([validatedOriginalFileName, validatedFilePermissions])) {
          return valid({
            name: validatedOriginalFileName.value,
            permissions: validatedFilePermissions.value,
            path
          });
        } else {
          return invalid({
            name: getInvalidValue(validatedOriginalFileName, undefined),
            metadata: getInvalidValue(validatedFilePermissions, undefined)
          });
        }
      },
      async respond(request) {
        const respond = (code: number, body: FileRecord | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
        if (!permissions.createFile(request.session)) {
          return respond(401, [permissions.ERROR_MESSAGE]);
        }
        switch (request.body.tag) {
          case 'invalid':
            return basicResponse(400, request.session, makeJsonResponseBody(request.body.value));
          case 'valid':
            const fileHash = await hashFile(request.body.value.name, request.body.value.path, request.body.value.permissions);
            const existingFile = await readOneFileByHash(connection, fileHash);
            if (existingFile) {
              return respond(200, existingFile);
            }
            const fileRecord = await createFile(connection, { ...request.body.value, fileHash }, request.session.user!.id);
            return respond(200, fileRecord);
        }
      }
    };
  }
};

export default resource;
