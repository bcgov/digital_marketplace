import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/subscribers/team-with-us";

const NAMESPACE = "subscribers/team-with-us";

/**
 *
 */
export function create<Msg>(): crud.CreateAction<
  Resource.CreateRequestBody,
  Resource.TWUOpportunitySubscriber,
  Resource.CreateValidationErrors,
  Msg
> {
  return crud.makeCreateAction(
    NAMESPACE,
    (a: Resource.TWUOpportunitySubscriber) => a
  );
}

/**
 *
 */
export function delete_<Msg>(): crud.DeleteAction<
  Resource.TWUOpportunitySubscriber,
  Resource.DeleteValidationErrors,
  Msg
> {
  return crud.makeDeleteAction(
    NAMESPACE,
    (a: Resource.TWUOpportunitySubscriber) => a
  );
}
