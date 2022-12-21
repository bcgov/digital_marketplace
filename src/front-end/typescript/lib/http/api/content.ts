import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/content";

const NAMESPACE = "content";

export const create: crud.CreateAction<
  Resource.CreateRequestBody,
  Resource.Content,
  Resource.CreateValidationErrors,
  unknown
> = crud.makeCreateAction(NAMESPACE, (a: Resource.Content) => a);

export const readMany: crud.ReadManyAction<
  Resource.ContentSlim,
  string[],
  unknown
> = crud.makeReadManyAction(NAMESPACE, (a: Resource.ContentSlim) => a);

export const readOne: crud.ReadOneAction<Resource.Content, string[], unknown> =
  crud.makeReadOneAction(NAMESPACE, (a: Resource.Content) => a);

export const update: crud.UpdateAction<
  Resource.UpdateRequestBody,
  Resource.Content,
  Resource.UpdateValidationErrors,
  unknown
> = crud.makeUpdateAction(NAMESPACE, (a: Resource.Content) => a);

export const delete_: crud.DeleteAction<
  Resource.Content,
  Resource.DeleteValidationErrors,
  unknown
> = crud.makeDeleteAction(NAMESPACE, (a: Resource.Content) => a);
