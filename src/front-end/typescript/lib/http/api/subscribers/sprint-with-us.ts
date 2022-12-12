import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/subscribers/sprint-with-us";

const NAMESPACE = "subscribers/sprint-with-us";

export const create: crud.CreateAction<
  Resource.CreateRequestBody,
  Resource.SWUOpportunitySubscriber,
  Resource.CreateValidationErrors,
  unknown
> = crud.makeCreateAction(
  NAMESPACE,
  (a: Resource.SWUOpportunitySubscriber) => a
);

export const delete_: crud.DeleteAction<
  Resource.SWUOpportunitySubscriber,
  Resource.DeleteValidationErrors,
  unknown
> = crud.makeDeleteAction(
  NAMESPACE,
  (a: Resource.SWUOpportunitySubscriber) => a
);
