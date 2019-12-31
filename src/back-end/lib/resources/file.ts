import * as crud from 'back-end/lib/crud';
import { Connection, createFile, readOneFileBlob, readOneFileById } from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, FileResponseBody, FileUpload, JsonResponseBody, makeJsonResponseBody, nullRequestBodyHandler } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { lookup } from 'mime-types';
import shajs from 'sha.js';
import { getString } from 'shared/lib';
import { CreateValidationErrors, FilePermissions, FileRecord, FileUploadMetadata } from 'shared/lib/resources/file';
import { Session } from 'shared/lib/resources/session';
import { UserType } from 'shared/lib/resources/user';
import { adt, Id } from 'shared/lib/types';
import { allValid, getInvalidValue, invalid, valid } from 'shared/lib/validation';
import { validateFileName } from 'shared/lib/validation/file';

export function hashFile(originalName: string, data: Buffer): string {
  const hash = shajs('sha1');
  hash.update(data);
  return hash.digest('base64');
}

export type CreateRequestBody = FileUpload<FileUploadMetadata> | null;

export interface ValidatedCreateRequestBody extends Pick<FileUpload<FileUploadMetadata>, 'name' | 'path'> {
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
    return nullRequestBodyHandler<FileResponseBody | JsonResponseBody<FileRecord | string[]>, Session>(async request => {
      const getBlob = getString(request.query, 'type') === 'blob';
      const respond = (code: number, body: FileRecord | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
      if (await permissions.readOneFile(connection, request.session, request.params.id)) {
        const file = await readOneFileById(connection, request.params.id);
        if (!getBlob) { return respond(200, file); }
        const blob = await readOneFileBlob(connection, file.fileBlob);
        if (blob) {
          return basicResponse(200, request.session, adt('file', {
            buffer: blob.blob,
            contentType: lookup(file.name) || 'application/octet-stream',
            contentDisposition: `attachment; filename="${file.name}"`
          }));
        }
      }
      return respond(401, [permissions.ERROR_MESSAGE]);
    });
  },

  create(connection) {
    return {
      async parseRequestBody(request) {
        return request.body.tag === 'file' ? request.body.value : null;
      },
      async validateRequestBody(request) {
        if (!request.body) {
          return invalid({
            requestBodyType: ['You need to submit a valid multipart request to create a file.']
          });
        }
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
        const respond = (code: number, body: FileRecord | CreateValidationErrors) => basicResponse(code, request.session, makeJsonResponseBody(body));
        if (!permissions.createFile(request.session) || !request.session.user) {
          return respond(401, {
            permissions: [permissions.ERROR_MESSAGE]
          });
        }
        switch (request.body.tag) {
          case 'invalid':
            return respond(400, request.body.value);
          case 'valid':
            const fileRecord = await createFile(connection, request.body.value, request.session.user.id);
            return respond(201, fileRecord);
        }
      }
    };
  }
};

export default resource;
