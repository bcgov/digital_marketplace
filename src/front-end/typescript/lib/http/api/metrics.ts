import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/metrics";

const NAMESPACE = "metrics";

export function readMany<Msg>(): crud.ReadManyAction<
  Resource.OpportunityMetrics,
  string[],
  Msg
> {
  return crud.makeReadManyAction(
    NAMESPACE,
    (a: Resource.OpportunityMetrics) => a
  );
}
