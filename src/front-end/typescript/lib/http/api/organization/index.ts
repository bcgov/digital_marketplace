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

export const create: crud.CreateAction<
  Resource.CreateRequestBody,
  Resource.Organization,
  Resource.CreateValidationErrors,
  unknown
> = crud.makeCreateAction(NAMESPACE, rawOrganizationToOrganization);

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
    url: crud.apiNamespace(
      `${NAMESPACE}?page=${window.encodeURIComponent(
        page
      )}&pageSize=${window.encodeURIComponent(pageSize)}`
    ),
    transformResponse: (raw: RawOrganizationReadManyResponse) => {
      return {
        ...raw,
        items: raw.items.map((i) => rawOrganizationSlimToOrganizationSlim(i))
      };
    },
    handleResponse
  });
}

export const readOne: crud.ReadOneAction<
  Resource.Organization,
  Resource.DeleteValidationErrors,
  unknown
> = crud.makeReadOneAction(NAMESPACE, rawOrganizationToOrganization);

export const update: crud.UpdateAction<
  Resource.UpdateRequestBody,
  Resource.Organization,
  Resource.UpdateValidationErrors,
  unknown
> = crud.makeUpdateAction(NAMESPACE, rawOrganizationToOrganization);

export const delete_: crud.DeleteAction<
  Resource.Organization,
  Resource.DeleteValidationErrors,
  unknown
> = crud.makeDeleteAction(NAMESPACE, rawOrganizationToOrganization);
