import { prefixPath } from "front-end/lib";
import { prefix } from "shared/lib";
import { invalid, valid, ResponseValidation } from "shared/lib/http";
import { Id, ClientHttpMethod } from "shared/lib/types";
import { Immutable, immutable, component } from "front-end/lib/framework";

export const apiNamespace = (p: string) => `/${prefix(prefixPath("api"))(p)}`;

export type HandleResponse<ValidResponse, InvalidResponse, Msg> = (
  response: ResponseValidation<ValidResponse, InvalidResponse>
) => Msg;

export type CreateAction<RequestBody, ValidResponse, InvalidResponse, Msg> = (
  body: RequestBody,
  handleResponse: HandleResponse<ValidResponse, InvalidResponse, Msg>
) => component.cmd.Cmd<Msg>;

export type CreateManyAction<RequestBodyItem, ValidItem, InvalidItem, Msg> = (
  body: RequestBodyItem[],
  handleResponse: HandleResponse<ValidItem[], InvalidItem[], Msg>
) => component.cmd.Cmd<Msg>;

export type ReadManyAction<ValidItem, InvalidResponse, Msg> = (
  handleResponse: HandleResponse<ValidItem[], InvalidResponse, Msg>
) => component.cmd.Cmd<Msg>;

export type ReadOneAction<ValidResponse, InvalidResponse, Msg> = (
  id: Id,
  handleResponse: HandleResponse<ValidResponse, InvalidResponse, Msg>
) => component.cmd.Cmd<Msg>;

export type UpdateAction<RequestBody, ValidResponse, InvalidResponse, Msg> = (
  id: Id,
  body: RequestBody,
  handleResponse: HandleResponse<ValidResponse, InvalidResponse, Msg>
) => component.cmd.Cmd<Msg>;

export type DeleteAction<ValidResponse, InvalidResponse, Msg> = (
  id: Id,
  handleResponse: HandleResponse<ValidResponse, InvalidResponse, Msg>
) => component.cmd.Cmd<Msg>;

/**
 * Ensuring the http request is formatted in the correct way, prior to sending to the back-end
 *
 * @param path
 * @param transformResponse
 * @param query
 * @returns
 */
export function makeCreateAction<
  RequestBody extends object | null,
  RawResponse,
  ValidResponse,
  InvalidResponse,
  Msg
>(
  path: string,
  transformResponse: (raw: RawResponse) => ValidResponse,
  query?: string
): CreateAction<RequestBody, ValidResponse, InvalidResponse, Msg> {
  return (body, handleResponse) =>
    component.cmd.httpRequest({
      method: ClientHttpMethod.Post,
      url: `${apiNamespace(path)}${makeQueryString(query)}`,
      body,
      transformResponse,
      handleResponse
    });
}

// makeCreateManyAction

export function makeCreateManyAction<
  RequestBodyItem,
  ValidItem,
  InvalidItem,
  Msg
>(
  create: CreateAction<RequestBodyItem, ValidItem, InvalidItem, unknown>,
  emptyInvalidResult: InvalidItem
): CreateManyAction<RequestBodyItem, ValidItem, InvalidItem, Msg> {
  return (items, handleResponse) => {
    const resultsCmd: CreateManyAccumulatorCmd<ValidItem, InvalidItem> =
      items.reduce<CreateManyAccumulatorCmd<ValidItem, InvalidItem>>(
        (cmd, item) => {
          return component.cmd.andThen(
            cmd,
            (accumulator: CreateManyAccumulator<ValidItem, InvalidItem>) => {
              //Skip creating items if a validation error has occurred.
              if (accumulator.isInvalid)
                return component.cmd.dispatch(
                  appendInvalidCreateResult(accumulator, emptyInvalidResult)
                );
              // Create item if there have been no invalid items so far.
              return create(
                item,
                (result: ResponseValidation<ValidItem, InvalidItem>) =>
                  appendCreateResult(accumulator, emptyInvalidResult, result)
              ) as component.cmd.Cmd<
                CreateManyAccumulator<ValidItem, InvalidItem>
              >;
            }
          );
        },
        component.cmd.dispatch(
          emptyCreateManyAccumulator<ValidItem, InvalidItem>()
        )
      );
    return component.cmd.map(
      resultsCmd,
      (accumulator: CreateManyAccumulator<ValidItem, InvalidItem>) =>
        handleResponse(
          accumulator.isInvalid
            ? invalid(accumulator.invalidResults)
            : valid(accumulator.validResults)
        )
    ) as component.cmd.Cmd<Msg>;
  };
}

//// makeCreateManyAction Helpers

type CreateManyAccumulatorCmd<ValidItem, InvalidItem> = component.cmd.Cmd<
  CreateManyAccumulator<ValidItem, InvalidItem>
>;

type CreateManyAccumulator<ValidItem, InvalidItem> = Immutable<{
  isInvalid: boolean;
  validResults: ValidItem[];
  invalidResults: InvalidItem[];
}>;

function emptyCreateManyAccumulator<
  ValidItem,
  InvalidItem
>(): CreateManyAccumulator<ValidItem, InvalidItem> {
  return immutable({
    isInvalid: false,
    validResults: [],
    invalidResults: []
  });
}

function appendCreateResult<ValidItem, InvalidItem>(
  accumulator: CreateManyAccumulator<ValidItem, InvalidItem>,
  emptyInvalidResult: InvalidItem,
  result: ResponseValidation<ValidItem, InvalidItem>
): CreateManyAccumulator<ValidItem, InvalidItem> {
  switch (result.tag) {
    case "valid":
      return appendInvalidCreateResult(accumulator, emptyInvalidResult).update(
        "validResults",
        (results) => [...results, result.value]
      );
    case "invalid":
      return appendInvalidCreateResult(accumulator, result.value);
    case "unhandled":
      return appendInvalidCreateResult(accumulator, emptyInvalidResult);
  }
}

function appendInvalidCreateResult<ValidItem, InvalidItem>(
  accumulator: CreateManyAccumulator<ValidItem, InvalidItem>,
  invalidItem: InvalidItem
): CreateManyAccumulator<ValidItem, InvalidItem> {
  return accumulator.update("invalidResults", (results) => [
    ...results,
    invalidItem
  ]);
}

// makeReadManyAction

export function makeReadManyAction<RawItem, ValidItem, InvalidResponse, Msg>(
  path: string,
  transformItem: (raw: RawItem) => ValidItem,
  query?: string
): ReadManyAction<ValidItem, InvalidResponse, Msg> {
  return (handleResponse) =>
    component.cmd.httpRequest({
      method: ClientHttpMethod.Get,
      url: `${apiNamespace(path)}${makeQueryString(query)}`,
      transformResponse: (rawItems: RawItem[]) =>
        rawItems.map((item) => transformItem(item)),
      handleResponse
    });
}

// makeReadOneAction

export function makeReadOneAction<
  RawResponse,
  ValidResponse,
  InvalidResponse,
  Msg
>(
  path: string,
  transformResponse: (raw: RawResponse) => ValidResponse,
  query?: string
): ReadOneAction<ValidResponse, InvalidResponse, Msg> {
  return (id, handleResponse) =>
    component.cmd.httpRequest({
      method: ClientHttpMethod.Get,
      url: `${apiNamespace(`${path}/${id}`)}${makeQueryString(query)}`,
      transformResponse,
      handleResponse
    });
}

// makeUpdateAction

export function makeUpdateAction<
  RequestBody extends object | null,
  RawResponse,
  ValidResponse,
  InvalidResponse,
  Msg
>(
  path: string,
  transformResponse: (raw: RawResponse) => ValidResponse,
  query?: string
): UpdateAction<RequestBody, ValidResponse, InvalidResponse, Msg> {
  return (id, body, handleResponse) =>
    component.cmd.httpRequest({
      method: ClientHttpMethod.Put,
      url: `${apiNamespace(`${path}/${id}`)}${makeQueryString(query)}`,
      body: body,
      transformResponse,
      handleResponse
    });
}

// makeDeleteAction

export function makeDeleteAction<
  RawResponse,
  ValidResponse,
  InvalidResponse,
  Msg
>(
  path: string,
  transformResponse: (raw: RawResponse) => ValidResponse,
  query?: string
): DeleteAction<ValidResponse, InvalidResponse, Msg> {
  return (id, handleResponse) =>
    component.cmd.httpRequest({
      method: ClientHttpMethod.Delete,
      url: `${apiNamespace(`${path}/${id}`)}${makeQueryString(query)}`,
      transformResponse,
      handleResponse
    });
}

// Helpers

function makeQueryString(query?: string): string {
  return query ? `?${query}` : "";
}
