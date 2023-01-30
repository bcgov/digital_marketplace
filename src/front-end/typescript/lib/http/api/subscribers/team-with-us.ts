import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/subscribers/team-with-us";

const NAMESPACE = "subscribers/team-with-us";

export const create: crud.CreateAction<
  Resource.CreateRequestBody,
  Resource.TWUOpportunitySubscriber,
  Resource.CreateValidationErrors,
  unknown
> = crud.makeCreateAction(
  NAMESPACE,
  (a: Resource.TWUOpportunitySubscriber) => a
);

export const delete_: crud.DeleteAction<
  Resource.TWUOpportunitySubscriber,
  Resource.DeleteValidationErrors,
  unknown
> = crud.makeDeleteAction(
  NAMESPACE,
  (a: Resource.TWUOpportunitySubscriber) => a
);
