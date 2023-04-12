import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/email-notifications";

const NAMESPACE = "emailNotifications";

export function create<Msg>(): crud.CreateAction<
  Resource.CreateRequestBody,
  null,
  Resource.CreateValidationErrors,
  Msg
> {
  return crud.makeCreateAction(NAMESPACE, (a: null) => a);
}
