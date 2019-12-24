import { prefixRequest } from 'shared/lib/http';
import { FileRecord } from 'shared/lib/resources/file';
import * as OrgResource from 'shared/lib/resources/organization';
import { Session } from 'shared/lib/resources/session';
import * as UserResource from 'shared/lib/resources/user';
import { ClientHttpMethod, Id } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

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

export async function readManyUsers(): Promise<Validation<UserResource.User[]>> {
  const response = await apiRequest(ClientHttpMethod.Get, 'users');
  switch (response.status) {
    case 200:
      return valid(response.data as UserResource.User[]);
    default:
      return invalid([]);
  }
}

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

function readOne<T>(endpoint: string): (id: Id ) => Promise<T | null> {
  return (async (id: Id) => {
    const response = await apiRequest(ClientHttpMethod.Get, `${endpoint}/${id}`);
    switch (response.status) {
      case 304:
      case 200:
        return response.data as T;
      default:
        return null;
    }
  });
}

function readMany<T>(endpoint: string): () => Promise<T[]> {
  return (async () => {
    const response = await apiRequest(ClientHttpMethod.Get, endpoint);
    switch (response.status) {
      case 304:
      case 200:
        return response.data as T[];
      default:
        return [];
    }
  });
}

function create<T, RequestType>(endpoint: string): (requestObject: RequestType) => Promise<T | null> {
  return ( async (requestObject: RequestType) => {
    // TODO(Jesse): Can we avoid this casting situation somehow?
    const response = await apiRequest(ClientHttpMethod.Post, endpoint, requestObject as unknown as object);
    switch (response.status) {
      case 304:
      case 200:
        return response.data as T;
      default:
        return null;
    }
  });
}

function update<T, RequestType>(endpoint: string): (id: Id, requestObject: RequestType) => Promise<T | null> {
  return ( async (id: Id, requestObject: RequestType) => {
    // TODO(Jesse): Can we avoid this casting situation somehow?
    const response = await apiRequest(ClientHttpMethod.Put, `${endpoint}/${id}`, requestObject as unknown as object);
    switch (response.status) {
      case 304:
      case 200:
        return response.data as T;
      default:
        return null;
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

interface CrudResource<ResourceType, CreateRequest, UpdateRequest> {
  readOne: (id: Id) => Promise<ResourceType | null>;
  readMany: () => Promise<ResourceType[]>;
  create: (req: CreateRequest) => Promise<ResourceType | null>;
  update: (id: Id, req: UpdateRequest) => Promise<ResourceType | null>;
  destroy: (id: Id) => Promise<boolean>;
}

function makeCrudApi<ResourceType, CreateReq, UpdateReq>(endpoint: string): CrudResource<ResourceType, CreateReq, UpdateReq> {
  return({
    readOne:   readOne<ResourceType>(endpoint),
    readMany:  readMany<ResourceType>(endpoint),
    create:    create<ResourceType, CreateReq>(endpoint),
    update:    update<ResourceType, UpdateReq>(endpoint),
    destroy:   destroy<ResourceType>(endpoint)
  });
}

export const OrgApi = makeCrudApi<OrgResource.Organization, OrgResource.CreateRequestBody, OrgResource.UpdateRequestBody>('organizations');
export const UserApi = makeCrudApi<UserResource.User, null, UserResource.UpdateRequestBody>('users');
