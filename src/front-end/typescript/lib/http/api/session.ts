import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/session";

const NAMESPACE = "sessions";

export function readOne<Msg>(): crud.ReadOneAction<
  Resource.Session,
  string[],
  Msg
> {
  return crud.makeReadOneAction(NAMESPACE, (a: Resource.Session) => a);
}

export function delete_<Msg>(): crud.DeleteAction<
  Resource.Session,
  string[],
  Msg
> {
  return crud.makeDeleteAction(NAMESPACE, (a: Resource.Session) => a);
}
