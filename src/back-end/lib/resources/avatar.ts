
import * as crud from 'back-end/lib/crud';
import { Connection } from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import FileResource, { CreateRequestBody, ValidatedCreateRequestBody } from 'back-end/lib/resources/file';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { CreateValidationErrors } from 'shared/lib/resources/file';
import { Session } from 'shared/lib/resources/session';
import { getInvalidValue, invalid, isValid, valid, Validation } from 'shared/lib/validation';
import * as fileValidation from 'shared/lib/validation/file';

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
  routeNamespace: 'avatars',

  readOne: FileResource.readOne,
  create(connection) {
    const fileCreateObj = FileResource.create!(connection);
    return {
      parseRequestBody: fileCreateObj.parseRequestBody,
      async validateRequestBody(request): Promise<Validation<ValidatedCreateRequestBody, CreateValidationErrors>> {
        // Perform regular file validation
        const validatedRequestBody = await fileCreateObj.validateRequestBody(request);
        // Then perform avatar-specific validation
        if (isValid(validatedRequestBody)) {
          if (!request.body) {
            return invalid({
              requestBodyType: ['You need to submit a valid multipart request to create a file']
            });
          }
          const { name } = request.body;
          const validatedFileName = fileValidation.validateFileName(name, ['png', 'jpg', 'jpeg']);
          if (isValid(validatedFileName)) {
            if (!request.session.user || !permissions.createAvatar(request.session, request.session.user.id)) {
              return invalid({
                permissions: [permissions.ERROR_MESSAGE]
              });
            }
            return valid({
              ...validatedRequestBody.value,
              name: validatedFileName.value
            });
          } else {
            return invalid({
              name: getInvalidValue(validatedFileName, undefined)
            });
          }
        }
        return validatedRequestBody;
      },
      respond: fileCreateObj.respond
    };
  }
};

export default resource;
