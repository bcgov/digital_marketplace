import {
  AVATAR_MAX_IMAGE_HEIGHT,
  AVATAR_MAX_IMAGE_WIDTH
} from "back-end/config";
import * as crud from "back-end/lib/crud";
import { Connection } from "back-end/lib/db";
import * as permissions from "back-end/lib/permissions";
import FileResource, {
  CreateRequestBody,
  ValidatedCreateRequestBody
} from "back-end/lib/resources/file";
import { CreateValidationErrors } from "shared/lib/resources/file";
import { Session } from "shared/lib/resources/session";
import {
  getInvalidValue,
  invalid,
  isValid,
  valid
} from "shared/lib/validation";
import * as fileValidation from "shared/lib/validation/file";
import sharp from "sharp";

async function compressAvatarImage(path: string): Promise<void> {
  try {
    const image = await sharp(path);
    const metadata = await image.metadata();
    let sharpStream = sharp(path, { failOn: "none" });
    if ((metadata.width ?? 0) > AVATAR_MAX_IMAGE_WIDTH) {
      sharpStream = await sharpStream.clone().resize({
        width: AVATAR_MAX_IMAGE_WIDTH
      });
    }

    if ((metadata.height ?? 0) > AVATAR_MAX_IMAGE_HEIGHT) {
      sharpStream = await sharpStream.clone().resize({
        height: AVATAR_MAX_IMAGE_HEIGHT
      });
    }

    const buffer = await sharpStream.toBuffer();
    await sharp(buffer).toFile(path);
  } catch (error) {
    console.warn("Unable to compress image", error);
  }
}

const routeNamespace = "avatars";

const create: crud.Create<
  Session,
  Connection,
  CreateRequestBody,
  ValidatedCreateRequestBody,
  CreateValidationErrors
> = (connection: Connection) => {
  if (!FileResource.create) {
    throw new Error(
      "Avatar resource cannot be defined without a FileResource.create operation"
    );
  }
  const fileCreateObj = FileResource.create(connection);
  return {
    ...fileCreateObj,
    async validateRequestBody(request) {
      // Perform regular file validation
      const validatedRequestBody = await fileCreateObj.validateRequestBody(
        request
      );
      // Then perform avatar-specific validation
      if (isValid(validatedRequestBody)) {
        const { name } = validatedRequestBody.value;
        const validatedFileName = fileValidation.validateAvatarFilename(name);
        if (isValid(validatedFileName)) {
          if (!request.session) {
            return invalid({
              permissions: [permissions.ERROR_MESSAGE]
            });
          }
          // Compress avatar image files to max width/height
          await compressAvatarImage(validatedRequestBody.value.path);
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
    }
  };
};

const resource: crud.BasicCrudResource<Session, Connection> = {
  routeNamespace,
  create
};

export default resource;
