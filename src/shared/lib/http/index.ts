import axios from 'axios';
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
