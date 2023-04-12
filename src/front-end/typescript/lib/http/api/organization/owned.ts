import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/organization";
import { rawOrganizationSlimToOrganizationSlim } from "front-end/lib/http/api/organization/lib";

const NAMESPACE = "ownedOrganizations";

export function readMany<Msg>(): crud.ReadManyAction<
  Resource.OrganizationSlim,
  string[],
  Msg
> {
  return crud.makeReadManyAction(
    NAMESPACE,
    rawOrganizationSlimToOrganizationSlim
  );
}
