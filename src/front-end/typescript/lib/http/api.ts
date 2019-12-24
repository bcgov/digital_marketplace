import { prefixRequest, request } from 'shared/lib/http';
import { FileRecord } from 'shared/lib/resources/file';
import * as OrgResource from 'shared/lib/resources/organization';
import { Session } from 'shared/lib/resources/session';
import * as UserResource from 'shared/lib/resources/user';
import { User } from 'shared/lib/resources/user';
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

export async function readManyUsers(): Promise<Validation<User[]>> {
  const response = await apiRequest(ClientHttpMethod.Get, 'users');
  switch (response.status) {
    case 200:
      return valid(response.data as User[]);
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

export function readOne<T>(endpoint: string): (id: Id ) => Promise<T | null> {
  return (async (id: Id) => {
    const response = await request(ClientHttpMethod.Get, `${endpoint}/${id}`);
    switch (response.status) {
      case 304:
      case 200:
        return response.data as T;
      default:
        return null;
    }
  });
}

export function readMany<T>(endpoint: string): () => Promise<T[]> {
  return (async () => {
    const response = await request(ClientHttpMethod.Get, endpoint);
    switch (response.status) {
      case 304:
      case 200:
        return response.data as T[];
      default:
        return [];
    }
  });
}

export function create<T, RequestType>(endpoint: string): (requestObject: RequestType) => Promise<T | null> {
  return ( async (requestObject: RequestType) => {
    // TODO(Jesse): Can we avoid this casting situation somehow?
    const response = await request(ClientHttpMethod.Post, endpoint, requestObject as unknown as object);
    switch (response.status) {
      case 304:
      case 200:
        return response.data as T;
      default:
        return null;
    }
  });
}

export function update<T, RequestType>(endpoint: string): (id: Id, requestObject: RequestType) => Promise<T | null> {
  return ( async (id: Id, requestObject: RequestType) => {
    // TODO(Jesse): Can we avoid this casting situation somehow?
    const response = await request(ClientHttpMethod.Put, `${endpoint}/${id}`, requestObject as unknown as object);
    switch (response.status) {
      case 304:
      case 200:
        return response.data as T;
      default:
        return null;
    }
  });
}

export interface CrudResource<ResourceType, CreateReq, UpdateReq> {
  readOne: () => Promise<ResourceType | null>;
  readMany: () => Promise<ResourceType[]>;
  create: () => Promise<ResourceType | null>;
  update: () => Promise<ResourceType | null>;
}

function makeCrudApi<ResourceType, CreateReq, UpdateReq>(endpoint: string) {
  return({
    readOne:   readOne<ResourceType>(endpoint),
    readMany:  readMany<ResourceType>(endpoint),
    create:    create<ResourceType, CreateReq>(endpoint),
    update:    update<ResourceType, UpdateReq>(endpoint)
  });
}

export const OrgApi = makeCrudApi<OrgResource.Organization, OrgResource.CreateRequestBody, OrgResource.UpdateRequestBody>('/api/organizations');
export const UserApi = makeCrudApi<UserResource.User, null, UserResource.UpdateRequestBody>('/api/users');
