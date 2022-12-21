import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/file";
import {
  rawFileRecordToFileRecord,
  makeCreateAction,
  CreateFileRequestBody
} from "front-end/lib/http/api/file/lib";

export * as markdownImages from "front-end/lib/http/api/file/markdown-image";
export * as avatars from "front-end/lib/http/api/file/avatar";
export { CreateFileRequestBody } from "front-end/lib/http/api/file/lib";

const NAMESPACE = "files";

export const create: crud.CreateAction<
  CreateFileRequestBody,
  Resource.FileRecord,
  Resource.CreateValidationErrors,
  unknown
> = makeCreateAction(NAMESPACE);

export const createMany: crud.CreateManyAction<
  CreateFileRequestBody,
  Resource.FileRecord,
  Resource.CreateValidationErrors,
  unknown
> = crud.makeCreateManyAction(create, {});

export const readOne: crud.ReadOneAction<
  Resource.FileRecord,
  string[],
  unknown
> = crud.makeReadOneAction(NAMESPACE, rawFileRecordToFileRecord);
