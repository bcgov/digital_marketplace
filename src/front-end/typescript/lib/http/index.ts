import axios from 'axios';
import { ClientHttpMethod } from 'shared/lib/types';

interface Response<Data> {
  status: number;
  data: Data;
}

export type RequestFunction = <Data>(method: ClientHttpMethod, path: string, data?: object) => Promise<Response<Data>>;

export const request: RequestFunction = async (method, url, data) => {
  try {
    const axiosResponse = await axios({
      method,
      url,
      data,
      validateStatus() {
        return true;
      }
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
}

export function prefixRequest(prefix: string): RequestFunction {
  const cleanSlashes = (v: string): string => v.replace(/^\/*/, '/').replace(/\/*$/, '');
  return (method, path, data) => {
    return request(method, `${cleanSlashes(prefix)}${cleanSlashes(path)}`, data);
  };
}
