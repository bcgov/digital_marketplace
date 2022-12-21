import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/session";

const NAMESPACE = "sessions";

export const readOne: crud.ReadOneAction<Resource.Session, string[], unknown> =
  crud.makeReadOneAction(NAMESPACE, (a: Resource.Session) => a);

export const delete_: crud.DeleteAction<Resource.Session, string[], unknown> =
  crud.makeDeleteAction(NAMESPACE, (a: Resource.Session) => a);
