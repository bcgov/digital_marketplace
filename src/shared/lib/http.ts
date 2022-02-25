import axios from 'axios';
import { ADT, adt } from 'shared/lib/types';
import { ClientHttpMethod } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

// Response Validation

export { invalid, valid } from 'shared/lib/validation';

export type ResponseValidation<Valid, Invalid>
  = Validation<Valid, Invalid>
  | ADT<'unhandled'>;

export const unhandled = () => adt('unhandled' as const);

export function isValid<T>(v: ResponseValidation<T, unknown>): v is ADT<'valid', T> {
  return v.tag === 'valid';
}

export function isInvalid<T>(v: ResponseValidation<unknown, T>): v is ADT<'invalid', T> {
  return v.tag === 'invalid';
}

export function isUnhandled(v: ResponseValidation<unknown, unknown>): v is ADT<'unhandled'> {
  return v.tag === 'unhandled';
}

export function getValidValue<T>(v: ResponseValidation<T, unknown>, fallback: T): T {
  return v.tag === 'valid' ? v.value : fallback;
}

export function getInvalidValue<T>(v: ResponseValidation<unknown, T>, fallback: T): T {
  return v.tag === 'invalid' ? v.value : fallback;
}

export function mapValid<A, B, C>(value: ResponseValidation<A, B>, fn: (b: A) => C): ResponseValidation<C, B> {
  switch (value.tag) {
    case 'valid': return valid<C>(fn(value.value));
    default: return value;
  }
}

export function mapInvalid<A, B, C>(value: ResponseValidation<A, B>, fn: (b: B) => C): ResponseValidation<A, C> {
  switch (value.tag) {
    case 'invalid': return invalid<C>(fn(value.value));
    default: return value;
  }
}

// HTTP Functions

interface Response<Data> {
  status: number;
  data: Data;
}

export type RequestFunction = <Data>(method: ClientHttpMethod, path: string, data?: object | string, headers?: object) => Promise<Response<Data>>;

export const request: RequestFunction = async (method: any, url: any, data: any, headers: any) => {
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
