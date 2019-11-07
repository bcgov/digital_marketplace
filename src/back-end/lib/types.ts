import { ErrorResponseBody, FileResponseBody, JsonRequestBody, JsonResponseBody, TextResponseBody } from 'back-end/lib/server';

export enum ServerHttpMethod {
  Any = '*',
  Get = 'GET',
  Post = 'POST',
  Put = 'PUT',
  Patch = 'PATCH',
  Delete = 'DELETE',
  Options = 'OPTIONS'
}

export function parseServerHttpMethod(raw: string): ServerHttpMethod | null {
  switch (raw.toLowerCase()) {
    case 'get':
      return ServerHttpMethod.Get;
    case 'post':
      return ServerHttpMethod.Post;
    case 'put':
      return ServerHttpMethod.Put;
    case 'patch':
      return ServerHttpMethod.Patch;
    case 'delete':
      return ServerHttpMethod.Delete;
    case 'options':
      return ServerHttpMethod.Options;
    default:
      return null;
  }
}

export type SupportedRequestBodies = JsonRequestBody;

export type SupportedResponseBodies
  = JsonResponseBody
  | FileResponseBody
  | TextResponseBody
  | ErrorResponseBody;
