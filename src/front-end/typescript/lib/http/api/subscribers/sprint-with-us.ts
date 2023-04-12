import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/subscribers/sprint-with-us";

const NAMESPACE = "subscribers/sprint-with-us";

export function create<Msg>(): crud.CreateAction<
  Resource.CreateRequestBody,
  Resource.SWUOpportunitySubscriber,
  Resource.CreateValidationErrors,
  Msg
> {
  return crud.makeCreateAction(
    NAMESPACE,
    (a: Resource.SWUOpportunitySubscriber) => a
  );
}

export function delete_<Msg>(): crud.DeleteAction<
  Resource.SWUOpportunitySubscriber,
  Resource.DeleteValidationErrors,
  Msg
> {
  return crud.makeDeleteAction(
    NAMESPACE,
    (a: Resource.SWUOpportunitySubscriber) => a
  );
}
