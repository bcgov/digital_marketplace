import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/file";
import {
  rawFileRecordToFileRecord,
  makeCreateAction,
  CreateFileRequestBody
} from "front-end/lib/http/api/file/lib";

export * as markdownImages from "front-end/lib/http/api/file/markdown-image";
export * as avatars from "front-end/lib/http/api/file/avatar";
export type { CreateFileRequestBody } from "front-end/lib/http/api/file/lib";

const NAMESPACE = "files";

export function create<Msg>(): crud.CreateAction<
  CreateFileRequestBody,
  Resource.FileRecord,
  Resource.CreateValidationErrors,
  Msg
> {
  return makeCreateAction(NAMESPACE);
}

export function createMany<Msg>(): crud.CreateManyAction<
  CreateFileRequestBody,
  Resource.FileRecord,
  Resource.CreateValidationErrors,
  Msg
> {
  return crud.makeCreateManyAction(create(), {});
}

export function readOne<Msg>(): crud.ReadOneAction<
  Resource.FileRecord,
  string[],
  Msg
> {
  return crud.makeReadOneAction(NAMESPACE, rawFileRecordToFileRecord);
}
