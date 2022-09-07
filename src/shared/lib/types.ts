export type Id = string;

export type Defined<T> = Exclude<T, undefined>;

export type IfElse<T, Extends, Yes, No> = T extends Extends ? Yes : No;

export type IfDefined<T, IsDefined, IsUndefined = undefined> = IfElse<
  T,
  undefined,
  IsUndefined,
  IsDefined
>;

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

export interface ADT<Tag, Value = undefined> {
  readonly tag: Tag;
  readonly value: Value;
}

export function adt<T>(tag: T, value?: undefined): ADT<T>;
export function adt<T, V>(tag: T, value: V): ADT<T, V>;
export function adt<T extends ADT<unknown, unknown>>(
  tag: T["tag"],
  value: T["value"]
): ADT<T["tag"], T["value"]> {
  return { tag, value };
}

export function adtCurried<T extends ADT<unknown, unknown>>(
  tag: T["tag"]
): (value: T["value"]) => ADT<T["tag"], T["value"]> {
  return (value) => adt(tag, value);
}

export enum ClientHttpMethod {
  Get = "GET",
  Post = "POST",
  Put = "PUT",
  Patch = "PATCH",
  Delete = "DELETE",
  Options = "OPTIONS"
}

export interface BodyWithErrors {
  permissions?: string[];
  database?: string[];
  notFound?: string[];
  conflict?: string[];
}

export type Comparison = -1 | 0 | 1;

export interface ReadManyResponseBodyBase<T> {
  page: number;
  pageSize: number;
  numPages: number;
  items: T[];
}

export function emptyReadManyResponseBody<T>(): ReadManyResponseBodyBase<T> {
  return {
    page: 1,
    pageSize: 0,
    numPages: 1,
    items: []
  };
}

export interface ReadManyResponseValidationErrors extends BodyWithErrors {
  page?: string[];
  pageSize?: string[];
}
