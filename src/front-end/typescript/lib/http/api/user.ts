import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/user";

const NAMESPACE = "users";

export function readMany<Msg>(): crud.ReadManyAction<
  Resource.User,
  string[],
  Msg
> {
  return crud.makeReadManyAction(NAMESPACE, (a: Resource.User) => a);
}

export function readOne<Msg>(): crud.ReadOneAction<
  Resource.User,
  string[],
  Msg
> {
  return crud.makeReadOneAction(NAMESPACE, (a: Resource.User) => a);
}

export function update<Msg>(): crud.UpdateAction<
  Resource.UpdateRequestBody,
  Resource.User,
  Resource.UpdateValidationErrors,
  Msg
> {
  return crud.makeUpdateAction(NAMESPACE, (a: Resource.User) => a);
}

export function delete_<Msg>(): crud.DeleteAction<
  Resource.User,
  string[],
  Msg
> {
  return crud.makeDeleteAction(NAMESPACE, (a: Resource.User) => a);
}
