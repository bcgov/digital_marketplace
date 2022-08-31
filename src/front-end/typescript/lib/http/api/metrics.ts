import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/metrics";

const NAMESPACE = "metrics";

export const readMany: crud.ReadManyAction<
  Resource.OpportunityMetrics,
  string[],
  unknown
> = crud.makeReadManyAction(NAMESPACE, (a: Resource.OpportunityMetrics) => a);
