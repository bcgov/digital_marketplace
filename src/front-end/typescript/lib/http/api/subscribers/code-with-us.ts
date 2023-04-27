import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/subscribers/code-with-us";

const NAMESPACE = "subscribers/code-with-us";

export function create<Msg>(): crud.CreateAction<
  Resource.CreateRequestBody,
  Resource.CWUOpportunitySubscriber,
  Resource.CreateValidationErrors,
  Msg
> {
  return crud.makeCreateAction(
    NAMESPACE,
    (a: Resource.CWUOpportunitySubscriber) => a
  );
}

export function delete_<Msg>(): crud.DeleteAction<
  Resource.CWUOpportunitySubscriber,
  Resource.DeleteValidationErrors,
  Msg
> {
  return crud.makeDeleteAction(
    NAMESPACE,
    (a: Resource.CWUOpportunitySubscriber) => a
  );
}
