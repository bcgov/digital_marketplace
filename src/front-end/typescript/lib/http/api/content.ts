import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/content";

const NAMESPACE = "content";

export function create<Msg>(): crud.CreateAction<
  Resource.CreateRequestBody,
  Resource.Content,
  Resource.CreateValidationErrors,
  Msg
> {
  return crud.makeCreateAction(NAMESPACE, (a: Resource.Content) => a);
}

export function readMany<Msg>(): crud.ReadManyAction<
  Resource.ContentSlim,
  string[],
  Msg
> {
  return crud.makeReadManyAction(NAMESPACE, (a: Resource.ContentSlim) => a);
}

export function readOne<Msg>(): crud.ReadOneAction<
  Resource.Content,
  string[],
  Msg
> {
  return crud.makeReadOneAction(NAMESPACE, (a: Resource.Content) => a);
}

export function update<Msg>(): crud.UpdateAction<
  Resource.UpdateRequestBody,
  Resource.Content,
  Resource.UpdateValidationErrors,
  Msg
> {
  return crud.makeUpdateAction(NAMESPACE, (a: Resource.Content) => a);
}

export function delete_<Msg>(): crud.DeleteAction<
  Resource.Content,
  Resource.DeleteValidationErrors,
  Msg
> {
  return crud.makeDeleteAction(NAMESPACE, (a: Resource.Content) => a);
}
