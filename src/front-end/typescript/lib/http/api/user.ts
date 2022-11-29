import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/user";

const NAMESPACE = "users";

export const readMany: crud.ReadManyAction<Resource.User, string[], unknown> =
  crud.makeReadManyAction(NAMESPACE, (a: Resource.User) => a);

export const readOne: crud.ReadOneAction<Resource.User, string[], unknown> =
  crud.makeReadOneAction(NAMESPACE, (a: Resource.User) => a);

export const update: crud.UpdateAction<
  Resource.UpdateRequestBody,
  Resource.User,
  Resource.UpdateValidationErrors,
  unknown
> = crud.makeUpdateAction(NAMESPACE, (a: Resource.User) => a);

export const delete_: crud.DeleteAction<Resource.User, string[], unknown> =
  crud.makeDeleteAction(NAMESPACE, (a: Resource.User) => a);
