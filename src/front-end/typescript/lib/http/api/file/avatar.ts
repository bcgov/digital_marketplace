import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/file";
import {
  makeCreateAction,
  CreateFileRequestBody
} from "front-end/lib/http/api/file/lib";

const NAMESPACE = "avatars";

export const create: crud.CreateAction<
  CreateFileRequestBody,
  Resource.FileRecord,
  Resource.CreateValidationErrors,
  unknown
> = makeCreateAction(NAMESPACE);
