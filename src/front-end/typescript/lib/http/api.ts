import { prefixRequest } from 'shared/lib/http';
import * as FileResource from 'shared/lib/resources/file';
import * as OrgResource from 'shared/lib/resources/organization';
import * as SessionResource from 'shared/lib/resources/session';
import * as UserResource from 'shared/lib/resources/user';
import { ADT, adt, ClientHttpMethod, Defined, Id } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

// Response Validation

export { invalid, valid, isInvalid, isValid } from 'shared/lib/validation';

type ResponseValidation<Valid, Invalid>
  = Validation<Valid, Invalid>
  | ADT<'unhandled'>;

export const unhandled = () => adt('unhandled' as const);

export function isUnhandled(v: ResponseValidation<any, any>): v is ADT<'unhandled'> {
  return v.tag === 'unhandled';
}

// Types

interface ActionTypes {
  rawResponse: unknown;
  validResponse: unknown;
  invalidResponse: unknown;
}

interface ActionWithBodyTypes extends ActionTypes {
  request: unknown;
}

interface BaseResourceTypes {
  create?: ActionWithBodyTypes;
  readMany?: ActionTypes;
  readOne?: ActionTypes;
  update?: ActionWithBodyTypes;
  delete?: ActionTypes;
}

type CrudClientAction<T extends ActionTypes> = () => Promise<ResponseValidation<T['validResponse'], T['invalidResponse']>>;

type CrudClientActionWithBody<T extends ActionWithBodyTypes> = (body: T['request']) => Promise<ResponseValidation<T['validResponse'], T['invalidResponse']>>;

type CrudClientActionWithId<T extends ActionTypes> = (id: Id) => Promise<ResponseValidation<T['validResponse'], T['invalidResponse']>>;

type CrudClientActionWithIdAndBody<T extends ActionWithBodyTypes> = (id: Id, body: T['request']) => Promise<ResponseValidation<T['validResponse'], T['invalidResponse']>>;

interface CrudApi<ResourceTypes extends BaseResourceTypes> {
  create: ResourceTypes['create'] extends undefined
    ? undefined
    : CrudClientActionWithBody<Defined<ResourceTypes['create']>>;
  readMany: ResourceTypes['readMany'] extends undefined
    ? undefined
    : CrudClientAction<Defined<ResourceTypes['readMany']>>;
  readOne: ResourceTypes['readOne'] extends undefined
    ? undefined
    : CrudClientActionWithId<Defined<ResourceTypes['readOne']>>;
  update: ResourceTypes['update'] extends undefined
    ? undefined
    : CrudClientActionWithBody<Defined<ResourceTypes['update']>>;
  delete: ResourceTypes['delete'] extends undefined
    ? undefined
    : CrudClientActionWithId<Defined<ResourceTypes['delete']>>;
}

// Run-Time Implementation

export const apiRequest = prefixRequest('api');

type TransformValid<T extends ActionTypes> = (raw: T['rawResponse']) => T['validResponse'];

interface MakeRequestParams<T extends ActionWithBodyTypes> {
  method: ClientHttpMethod;
  url: string;
  body: T['request'];
  transformValid?: TransformValid<T>;
}

async function makeRequest<T extends ActionWithBodyTypes>(params: MakeRequestParams<T>): Promise<ResponseValidation<T['validResponse'], T['invalidResponse']>> {
  const response = await apiRequest(params.method, params.url);
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

interface MakeActionParams<T extends ActionWithBodyTypes> extends Pick<MakeRequestParams<T>, 'transformValid'> {
  routeNamespace: string;
}

export function makeCreate<T extends ActionWithBodyTypes>(params: MakeActionParams<T>): CrudClientActionWithBody<T> {
  return async body => makeRequest({
    body,
    method: ClientHttpMethod.Post,
    url: params.routeNamespace,
    transformValid: params.transformValid
  });
}

export function makeReadMany<T extends ActionTypes>(params: MakeActionParams<T & { request: any }>): CrudClientAction<T> {
  return async () => makeRequest({
    body: undefined,
    method: ClientHttpMethod.Get,
    url: params.routeNamespace,
    transformValid: params.transformValid
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

type CrudActionParams<ResourceTypes extends BaseResourceTypes, Action extends keyof BaseResourceTypes>
  = ResourceTypes[Action] extends undefined
      ? undefined
      : TransformValid<ResourceTypes[Action]>;

interface MakeCrudApiParams<ResourceTypes extends BaseResourceTypes> {
  routeNamespace: string;
  create: ResourceTypes['create'] extends undefined
    ? false
    : true;
  readMany: ResourceTypes['readMany'] extends undefined
    ? false
    : true;
  readOne: ResourceTypes['readOne'] extends undefined
    ? false
    : true;
  update: ResourceTypes['update'] extends undefined
    ? false
    : true;
  delete: ResourceTypes['delete'] extends undefined
    ? false
    : true;
}

export function makeCrudApi<ResourceTypes extends BaseResourceTypes>(params: MakeCrudApiParams<ResourceTypes>): CrudApi<ResourceTypes> {
  const { routeNamespace } = params;
  return {
    create: (params.create ? makeCreate({ routeNamespace }) : undefined) as CrudApi<ResourceTypes>['create'],
    readMany: (params.readMany ? makeCreate({ routeNamespace }) : undefined) as CrudApi<ResourceTypes>['readMany'],
    readOne: (params.readOne ? makeCreate({ routeNamespace }) : undefined) as CrudApi<ResourceTypes>['readOne'],
    update: (params.update ? makeCreate({ routeNamespace }) : undefined) as CrudApi<ResourceTypes>['update'],
    delete: (params.delete ? makeCreate({ routeNamespace }) : undefined) as CrudApi<ResourceTypes>['delete']
  };
}

interface OrgResourceTypes {
  create: {
    request: OrgResource.CreateRequestBody;
    rawResponse: OrgResource.Organization;
    validResponse: OrgResource.Organization;
    invalidResponse: OrgResource.CreateValidationErrors;
  };
  readMany: undefined;
  readOne: undefined;
  update: undefined;
  delete: undefined;
}

const noActions = {
  create: false,
  readMany: false,
  readOne: false,
  update: false,
  delete: false
} as const;

export const orgApi: CrudApi<OrgResourceTypes> = makeCrudApi({
  ...noActions,
  routeNamespace: 'organizations',
  create: true
});

orgApi.create(5 as any);

//interface CrudResource<
  //CreateRequestBody,
  //CreateValidResponseBody,
  //CreateInvalidResponseBody,
  //UpdateRequestBody,
  //UpdateValidResponseBody,
  //UpdateInvalidResponseBody
//> {
  //create: CrudClientActionWithBody<>;
//}

//function makeCrudApi<ResourceType, CreateReq, UpdateReq>(endpoint: string): CrudResource<ResourceType, CreateReq, UpdateReq> {
  //return({
    //create:    create<ResourceType, CreateReq>(endpoint),
    //readOne:   readOne<ResourceType>(endpoint),
    //readMany:  readMany<ResourceType>(endpoint),
    //update:    update<ResourceType, UpdateReq>(endpoint),
    //destroy:   destroy<ResourceType>(endpoint)
  //});
//}

//export const OrgApi = makeCrudApi<OrgResource.Organization, OrgResource.CreateRequestBody, OrgResource.UpdateRequestBody>('organizations');

//export const UserApi: Omit<CrudResource <UserResource.User, null, UserResource.UpdateRequestBody>, 'create'> = makeCrudApi('users');
