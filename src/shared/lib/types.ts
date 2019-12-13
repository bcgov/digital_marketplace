/**
 * "ADT" stands for "Algebraic Data Type".
 *
 * ```
 * type Color
 *   = ADT<'red'>
 *   | ADT<'blue'>
 *   | ADT<'green'>
 *   | ADT<'rgb', [number, number, number]>;
 *
 * const red: Color = { tag: 'red', value: undefined };
 * const rgb: Color = { tag: 'rgb', value: [123, 255, 7] };
 * ```
 */

export type Id = string;

export interface ADT<Tag, Value = undefined> {
  readonly tag: Tag;
  readonly value: Value;
}

export function adt<T>(tag: T, value?: undefined): ADT<T>;
export function adt<T, V>(tag: T, value: V): ADT<T, V>;
export function adt<T extends ADT<unknown, unknown>>(tag: T['tag'], value: T['value']): ADT<T['tag'], T['value']> {
  return { tag, value };
}

export function adtCurried<T extends ADT<unknown, unknown>>(tag: T['tag']): ((value: T['value']) => ADT<T['tag'], T['value']>) {
  return value => adt(tag, value);
}

export enum ClientHttpMethod {
  Get = 'GET',
  Post = 'POST',
  Put = 'PUT',
  Patch = 'PATCH',
  Delete = 'DELETE',
  Options = 'OPTIONS'
}

export type KeyCloakIdentityProvider = 'github' | 'idir';
