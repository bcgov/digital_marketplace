import { invalid, request, ResponseValidation, unhandled, valid } from 'shared/lib/http';
import { ClientHttpMethod, Defined, Id, IfDefined } from 'shared/lib/types';

// Types

interface ActionTypes {
  rawResponse: unknown;
  validResponse: unknown;
  invalidResponse: unknown;
}

interface ActionWithBodyTypes extends ActionTypes {
  request: unknown;
}

interface ReadManyActionTypes<T extends ActionTypes> {
  rawResponse: Array<T['rawResponse']>;
  validResponse: Array<T['validResponse']>;
  invalidResponse: T['invalidResponse'];
}

export interface BaseResourceTypes {
  create: ActionWithBodyTypes | undefined;
  readMany: ActionTypes | undefined;
  readOne: ActionTypes | undefined;
  update: ActionWithBodyTypes | undefined;
  delete: ActionTypes | undefined;
}

type CrudClientAction<T extends ActionTypes> = () => Promise<ResponseValidation<T['validResponse'], T['invalidResponse']>>;

type CrudClientActionWithBody<T extends ActionWithBodyTypes> = (body: T['request']) => Promise<ResponseValidation<T['validResponse'], T['invalidResponse']>>;

type CrudClientActionWithId<T extends ActionTypes> = (id: Id) => Promise<ResponseValidation<T['validResponse'], T['invalidResponse']>>;

type CrudClientActionWithIdAndBody<T extends ActionWithBodyTypes> = (id: Id, body: T['request']) => Promise<ResponseValidation<T['validResponse'], T['invalidResponse']>>;

export interface CrudApi<ResourceTypes extends BaseResourceTypes = BaseResourceTypes> {
  create: IfDefined<ResourceTypes['create'], CrudClientActionWithBody<Defined<ResourceTypes['create']>>>;
  readMany: IfDefined<ResourceTypes['readMany'], CrudClientAction<ReadManyActionTypes<Defined<ResourceTypes['readMany']>>>>;
  readOne: IfDefined<ResourceTypes['readOne'], CrudClientActionWithId<Defined<ResourceTypes['readOne']>>>;
  update: IfDefined<ResourceTypes['update'], CrudClientActionWithIdAndBody<Defined<ResourceTypes['update']>>>;
  delete: IfDefined<ResourceTypes['delete'], CrudClientActionWithId<Defined<ResourceTypes['delete']>>>;
}

// Generic, customizable CRUD API.

type TransformValid<T extends ActionTypes> = (raw: T['rawResponse']) => T['validResponse'];

interface MakeRequestParams<T extends ActionWithBodyTypes> {
  method: ClientHttpMethod;
  url: string;
  body: T['request'];
  transformValid?: TransformValid<T>;
}

async function makeRequest<T extends ActionWithBodyTypes>(params: MakeRequestParams<T>): Promise<ResponseValidation<T['validResponse'], T['invalidResponse']>> {
  const response = await request(params.method, params.url);
  switch (response.status) {
    case 200:
    case 201:
      return valid(params.transformValid ? params.transformValid(response.data as T['rawResponse']) : response.data as T['validResponse']);
    case 400:
    case 401:
    case 404:
      return invalid(response.data as T['invalidResponse']);
    default:
      return unhandled();
  }
}

interface MakeActionParams<T extends ActionTypes> {
  routeNamespace: string;
  transformValid?: TransformValid<T>;
}

export function makeCreate<T extends ActionWithBodyTypes>(params: MakeActionParams<T>): CrudClientActionWithBody<T> {
  return async body => makeRequest({
    body,
    method: ClientHttpMethod.Post,
    url: params.routeNamespace,
    transformValid: params.transformValid
  });
}

export function makeReadMany<T extends ActionTypes>(params: MakeActionParams<T>): CrudClientAction<ReadManyActionTypes<T>> {
  const { transformValid } = params;
  return async () => makeRequest<ReadManyActionTypes<T> & { request: any }>({
    body: undefined,
    method: ClientHttpMethod.Get,
    url: params.routeNamespace,
    transformValid: transformValid && (v => v.map(w => transformValid(w)))
  });
}

export function makeReadOne<T extends ActionTypes>(params: MakeActionParams<T & { request: any }>): CrudClientActionWithId<T> {
  return async id => makeRequest({
    body: undefined,
    method: ClientHttpMethod.Get,
    url: `${params.routeNamespace}/${id}`,
    transformValid: params.transformValid
  });
}

export function makeUpdate<T extends ActionWithBodyTypes>(params: MakeActionParams<T>): CrudClientActionWithIdAndBody<T> {
  return async (id, body) => makeRequest({
    body,
    method: ClientHttpMethod.Put,
    url: `${params.routeNamespace}/${id}`,
    transformValid: params.transformValid
  });
}

export function makeDelete<T extends ActionTypes>(params: MakeActionParams<T & { request: any }>): CrudClientActionWithId<T> {
  return async id => makeRequest({
    body: undefined,
    method: ClientHttpMethod.Delete,
    url: `${params.routeNamespace}/${id}`,
    transformValid: params.transformValid
  });
}

type CrudActionParams<T extends ActionTypes> = Pick<MakeActionParams<T>, 'transformValid'>;

type DetermineCrudActionParams<ResourceTypes extends BaseResourceTypes, Action extends keyof BaseResourceTypes>
  = IfDefined<ResourceTypes[Action], CrudActionParams<Defined<ResourceTypes[Action]>>>;

interface MakeCrudApiParams<ResourceTypes extends BaseResourceTypes> {
  routeNamespace: string;
  create: DetermineCrudActionParams<ResourceTypes, 'create'>;
  readMany: DetermineCrudActionParams<ResourceTypes, 'readMany'>;
  readOne: DetermineCrudActionParams<ResourceTypes, 'readOne'>;
  update: DetermineCrudActionParams<ResourceTypes, 'update'>;
  delete: DetermineCrudActionParams<ResourceTypes, 'delete'>;
}

export function makeCrudApi<ResourceTypes extends BaseResourceTypes>(params: MakeCrudApiParams<ResourceTypes>): CrudApi<ResourceTypes> {
  const { routeNamespace } = params;
  return {
    create: params.create && makeCreate({ routeNamespace }),
    readMany: params.readMany && makeReadMany({ routeNamespace }),
    readOne: params.readOne && makeReadOne({ routeNamespace }),
    update: params.update && makeUpdate({ routeNamespace }),
    delete: params.delete && makeDelete({ routeNamespace })
  } as CrudApi<ResourceTypes>;
}

// Simple, easy-to-implement, CRUD API.

export interface SimpleResourceTypesParams<Record = unknown> {
  record: Record;
  create: {
    request: unknown;
    invalid: unknown;
  };
  update: {
    request: unknown;
    invalid: unknown;
  };
}

export interface SimpleResourceTypes<T extends SimpleResourceTypesParams> extends BaseResourceTypes {
  create: {
    request: T['create']['request'];
    rawResponse: T['record'];
    validResponse: T['record'];
    invalidResponse: T['create']['invalid'];
  };
  readMany: {
    rawResponse: T['record'];
    validResponse: T['record'];
    invalidResponse: string[];
  };
  readOne: {
    rawResponse: T['record'];
    validResponse: T['record'];
    invalidResponse: string[];
  };
  update: {
    request: T['update']['request'];
    rawResponse: T['record'];
    validResponse: T['record'];
    invalidResponse: T['update']['invalid'];
  };
  delete: {
    rawResponse: null;
    validResponse: null;
    invalidResponse: string[];
  };
}

export function makeSimpleActionParams<T extends ActionTypes>(): CrudActionParams<T> {
  return {
    transformValid: a => a
  };
}

export function makeSimpleCrudApi<
  Params extends SimpleResourceTypesParams,
  ResourceTypes extends SimpleResourceTypes<Params> = SimpleResourceTypes<Params>
>(routeNamespace: string): CrudApi<ResourceTypes> {
  return makeCrudApi({
    routeNamespace,
    create: makeSimpleActionParams(),
    readMany: makeSimpleActionParams(),
    readOne: makeSimpleActionParams(),
    update: makeSimpleActionParams(),
    delete: makeSimpleActionParams()
  } as MakeCrudApiParams<ResourceTypes>);
}

// Useful helper types and values.

export interface UndefinedResourceTypes extends BaseResourceTypes {
  create: undefined;
  readMany: undefined;
  readOne: undefined;
  update: undefined;
  delete: undefined;
}

export type PickCrudApi<ResourceTypes extends BaseResourceTypes, K extends keyof BaseResourceTypes> = {
  [P in keyof BaseResourceTypes]: P extends K ? ResourceTypes[P] : UndefinedResourceTypes[P];
};

export type OmitCrudApi<ResourceTypes extends BaseResourceTypes, K extends keyof BaseResourceTypes> = PickCrudApi<ResourceTypes, Exclude<keyof BaseResourceTypes, K>>;

export const undefinedActions: Omit<MakeCrudApiParams<UndefinedResourceTypes>, 'routeNamespace'> = {
  create: undefined,
  readMany: undefined,
  readOne: undefined,
  update: undefined,
  delete: undefined
};
