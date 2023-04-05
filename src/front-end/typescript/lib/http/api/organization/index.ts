import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/organization";
import { ResponseValidation } from "shared/lib/http";
import { ClientHttpMethod } from "shared/lib/types";
import { component } from "front-end/lib/framework";
import {
  rawOrganizationToOrganization,
  rawOrganizationSlimToOrganizationSlim,
  RawOrganizationReadManyResponse
} from "front-end/lib/http/api/organization/lib";

export * as owned from "front-end/lib/http/api/organization/owned";

const NAMESPACE = "organizations";

export function create<Msg>(): crud.CreateAction<
  Resource.CreateRequestBody,
  Resource.Organization,
  Resource.CreateValidationErrors,
  Msg
> {
  return crud.makeCreateAction(NAMESPACE, rawOrganizationToOrganization);
}

export function readMany<Msg>(
  page: number,
  pageSize: number,
  handleResponse: (
    response: ResponseValidation<
      Resource.ReadManyResponseBody,
      Resource.ReadManyResponseValidationErrors
    >
  ) => Msg
): component.Cmd<Msg> {
  return component.cmd.httpRequest({
    method: ClientHttpMethod.Get,
    url: `${crud.apiNamespace(NAMESPACE)}?page=${window.encodeURIComponent(
      page
    )}&pageSize=${window.encodeURIComponent(pageSize)}`,
    transformResponse: (raw: RawOrganizationReadManyResponse) => {
      return {
        ...raw,
        items: raw.items.map((i) => rawOrganizationSlimToOrganizationSlim(i))
      };
    },
    handleResponse
  });
}

export function readOne<Msg>(): crud.ReadOneAction<
  Resource.Organization,
  Resource.DeleteValidationErrors,
  Msg
> {
  return crud.makeReadOneAction(NAMESPACE, rawOrganizationToOrganization);
}

export function update<Msg>(): crud.UpdateAction<
  Resource.UpdateRequestBody,
  Resource.Organization,
  Resource.UpdateValidationErrors,
  Msg
> {
  return crud.makeUpdateAction(NAMESPACE, rawOrganizationToOrganization);
}

export function delete_<Msg>(): crud.DeleteAction<
  Resource.Organization,
  Resource.DeleteValidationErrors,
  Msg
> {
  return crud.makeDeleteAction(NAMESPACE, rawOrganizationToOrganization);
}
