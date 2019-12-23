import axios from 'axios';
import { Id } from 'shared/lib/types';
import { ClientHttpMethod } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

interface Response<Data> {
  status: number;
  data: Data;
}

export type RequestFunction = <Data>(method: ClientHttpMethod, path: string, data?: object | string, headers?: object) => Promise<Response<Data>>;

export const request: RequestFunction = async (method, url, data, headers) => {
  try {
    const axiosResponse = await axios({
      method,
      url,
      data,
      validateStatus() {
        return true;
      },
      headers
    });
    return {
      status: axiosResponse.status,
      data: axiosResponse.data
    };
  } catch (error) {
    return {
      status: 500,
      data: [error.message]
    };
  }
};

/**
 * This function tries to parse JSON safely without throwing
 * a run-time exception if the input is invalid.
 */
export function parseJsonSafely(raw: string): Validation<any, undefined> {
  try {
    return valid(JSON.parse(raw));
  } catch (error) {
    return invalid(undefined);
  }
}

export function prefixRequest(prefix: string): RequestFunction {
  const cleanSlashes = (v: string): string => v.replace(/^\/*/, '/').replace(/\/*$/, '');
  return (method, path, data) => {
    return request(method, `${cleanSlashes(prefix)}${cleanSlashes(path)}`, data);
  };
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

export function makeCrudInterface<ResourceType, CreateReq, UpdateReq>(endpoint: string) {
  return({
    readOne:   readOne<ResourceType>(endpoint),
    readMany:  readMany<ResourceType>(endpoint),
    create:    create<ResourceType, CreateReq>(endpoint),
    update:    update<ResourceType, UpdateReq>(endpoint)
  });
}
