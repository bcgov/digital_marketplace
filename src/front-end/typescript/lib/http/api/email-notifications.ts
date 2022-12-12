import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/email-notifications";

const NAMESPACE = "emailNotifications";

export const create: crud.CreateAction<
  Resource.CreateRequestBody,
  null,
  Resource.CreateValidationErrors,
  unknown
> = crud.makeCreateAction(NAMESPACE, (a: null) => a);
