import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/organization";
import { rawOrganizationSlimToOrganizationSlim } from "front-end/lib/http/api/organization/lib";

const NAMESPACE = "ownedOrganizations";

export const readMany: crud.ReadManyAction<
  Resource.OrganizationSlim,
  string[],
  unknown
> = crud.makeReadManyAction(NAMESPACE, rawOrganizationSlimToOrganizationSlim);
