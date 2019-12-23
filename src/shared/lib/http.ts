import axios from 'axios';
import { ClientHttpMethod } from 'shared/lib/types';

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

export function prefixRequest(prefix: string): RequestFunction {
  const cleanSlashes = (v: string): string => v.replace(/^\/*/, '/').replace(/\/*$/, '');
  return (method, path, data) => {
    return request(method, `${cleanSlashes(prefix)}${cleanSlashes(path)}`, data);
  };
}


export async function readOne<T>(endpoint: string): Promise<T | null> {
  const response = await request(ClientHttpMethod.Get, endpoint);
  switch (response.status) {
    case 304:
    case 200:
      return response.data as T;
    default:
      return null;
  }
}

export async function readMany<T>(endpoint: string): Promise<T[]> {
  const response = await request(ClientHttpMethod.Get, endpoint);
  switch (response.status) {
    case 304:
    case 200:
      return response.data as T[];
    default:
      return [];
  }
}

export async function create<T, RequestType>(endpoint: string, requestObject: RequestType): Promise<T | null> {
  // TODO(Jesse): Can we avoid this casting situation somehow?
  const response = await request(ClientHttpMethod.Post, endpoint, requestObject as unknown as object);
  switch (response.status) {
    case 304:
    case 200:
      return response.data as T;
    default:
      return null;
  }
}

export async function update<T, RequestType>(endpoint: string, requestObject: RequestType): Promise<T | null> {
  // TODO(Jesse): Can we avoid this casting situation somehow?
  const response = await request(ClientHttpMethod.Put, endpoint, requestObject as unknown as object);
  switch (response.status) {
    case 304:
    case 200:
      return response.data as T;
    default:
      return null;
  }
}

