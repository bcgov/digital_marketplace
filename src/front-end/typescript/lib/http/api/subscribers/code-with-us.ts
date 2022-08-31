import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/subscribers/code-with-us";

const NAMESPACE = "subscribers/code-with-us";

export const create: crud.CreateAction<
  Resource.CreateRequestBody,
  Resource.CWUOpportunitySubscriber,
  Resource.CreateValidationErrors,
  unknown
> = crud.makeCreateAction(
  NAMESPACE,
  (a: Resource.CWUOpportunitySubscriber) => a
);

export const delete_: crud.DeleteAction<
  Resource.CWUOpportunitySubscriber,
  Resource.DeleteValidationErrors,
  unknown
> = crud.makeDeleteAction(
  NAMESPACE,
  (a: Resource.CWUOpportunitySubscriber) => a
);
