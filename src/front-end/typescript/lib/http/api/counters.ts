import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/counter";

const NAMESPACE = "counters";

export function readMany<Msg>(
  counters: string[]
): crud.ReadManyAction<Resource.Counter, Resource.UpdateValidationErrors, Msg> {
  return crud.makeReadManyAction(
    NAMESPACE,
    (a: Resource.Counter) => a,
    `counters=${window.encodeURIComponent(counters.join(","))}`
  );
}

export const update: crud.UpdateAction<
  Resource.UpdateRequestBody,
  Resource.Counter,
  Resource.UpdateValidationErrors,
  unknown
> = crud.makeUpdateAction(NAMESPACE, (a: Resource.Counter) => a);
