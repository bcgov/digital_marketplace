import { prefixRequest } from 'shared/lib/http';
import { FileRecord } from 'shared/lib/resources/file';
import * as OrgResource from 'shared/lib/resources/organization';
import { Session } from 'shared/lib/resources/session';
import * as UserResource from 'shared/lib/resources/user';
import { ClientHttpMethod, Id } from 'shared/lib/types';
import { invalid, Invalid, valid, Valid, Validation, Validation_ } from 'shared/lib/validation';

export const apiRequest = prefixRequest('api');

function withCurrentSession(method: ClientHttpMethod): () => Promise<Validation<Session, null>> {
  return async () => {
    const response = await apiRequest(method, 'sessions/current');
    switch (response.status) {
      case 200:
        return valid(response.data as Session);
      default:
        return invalid(null);
    }
  };
}

export const readOneSession = withCurrentSession(ClientHttpMethod.Get);

export const deleteSession = withCurrentSession(ClientHttpMethod.Delete);

interface RawFileRecord extends Omit<FileRecord, 'createdAt'> {
  createdAt: string;
}

function rawFileRecordToFileRecord(raw: RawFileRecord): FileRecord {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt)
  };
}

export async function readOneFile(id: Id): Promise<Validation<FileRecord>> {
  const response = await apiRequest(ClientHttpMethod.Get, `files/${id}`);
  switch (response.status) {
    case 200:
      return valid(rawFileRecordToFileRecord(response.data as RawFileRecord));
    default:
      return invalid([]);
  }
}

function readOne<T>(endpoint: string): (id: Id ) => ReadOneReturnType<T> {
  return (async (id: Id) => {
    const response = await apiRequest(ClientHttpMethod.Get, `${endpoint}/${id}`);
    switch (response.status) {
      case 304:
      case 200:
        return { valid: response.data as T } as Valid<T>;
      default:
        return { invalid: response.data as string[] } as Invalid<string[]>;
    }
  });
}

function readMany<T>(endpoint: string): () => ReadManyReturnType<T> {
  return (async () => {
    const response = await apiRequest(ClientHttpMethod.Get, endpoint);
    switch (response.status) {
      case 304:
      case 200:
        return { valid: response.data as T[] } as Valid<T[]>;
      default:
        return { invalid: response.data as string[] } as Invalid<string[]>;
    }
  });
}

function create<T, RequestType>(endpoint: string): (requestObject: RequestType) => CreateReturnType<T> {
  return ( async (requestObject: RequestType) => {
    // TODO(Jesse): Can we avoid this casting situation somehow?
    const response = await apiRequest(ClientHttpMethod.Post, endpoint, requestObject as unknown as object);
    switch (response.status) {
      case 304:
      case 200:
        return { valid: response.data as T } as Valid<T>;
      default:
        return { invalid: response.data as string[] } as Invalid<string[]>;
    }
  });
}

function update<T, RequestType>(endpoint: string): (id: Id, requestObject: RequestType) => UpdateReturnType<T> {
  return ( async (id: Id, requestObject: RequestType) => {
    // TODO(Jesse): Can we avoid this casting situation somehow?
    const response = await apiRequest(ClientHttpMethod.Put, `${endpoint}/${id}`, requestObject as unknown as object);
    switch (response.status) {
      case 304:
      case 200:
        return { valid: response.data as T } as Valid<T>;
      default:
        return { invalid: response.data as string[]} as Invalid<string[]>;
    }
  });
}

function destroy<T>(endpoint: string): (id: Id) => Promise<boolean> {
  return ( async (id: Id) => {
    // TODO(Jesse): Can we avoid this casting situation somehow?
    const response = await apiRequest(ClientHttpMethod.Delete, `${endpoint}/${id}`);
    switch (response.status) {
      case 304:
      case 200:
        return true;
      default:
        return false;
    }
  });
}

type ReadOneReturnType<T>  = Promise<Validation_<T, string[]>>;
type ReadManyReturnType<T> = Promise<Validation_<T[], string[]>>;
type UpdateReturnType<T>   = ReadOneReturnType<T>;
type CreateReturnType<T>   = ReadOneReturnType<T>;
type DestroyReturnType     = Promise<boolean>;

interface CrudResource<ResourceType, CreateRequest, UpdateRequest> {
    create: (req: CreateRequest)         => CreateReturnType<ResourceType>;
   readOne: (id: Id)                     => ReadOneReturnType<ResourceType>;
  readMany: ()                           => ReadManyReturnType<ResourceType>;
    update: (id: Id, req: UpdateRequest) => UpdateReturnType<ResourceType>;
   destroy: (id: Id)                     => DestroyReturnType;
}

function makeCrudApi<ResourceType, CreateReq, UpdateReq>(endpoint: string): CrudResource<ResourceType, CreateReq, UpdateReq> {
  return({
    create:    create<ResourceType, CreateReq>(endpoint),
    readOne:   readOne<ResourceType>(endpoint),
    readMany:  readMany<ResourceType>(endpoint),
    update:    update<ResourceType, UpdateReq>(endpoint),
    destroy:   destroy<ResourceType>(endpoint)
  });
}

export const OrgApi = makeCrudApi<OrgResource.Organization, OrgResource.CreateRequestBody, OrgResource.UpdateRequestBody>('organizations');
export const UserApi = makeCrudApi<UserResource.User, null, UserResource.UpdateRequestBody>('users');
