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

export enum ClientHttpMethod {
  Get = 'GET',
  Post = 'POST',
  Put = 'PUT',
  Patch = 'PATCH',
  Delete = 'DELETE',
  Options = 'OPTIONS'
}

export enum UserTypes {
  Vendor = 'VENDOR',
  Government = 'GOV',
  Admin = 'ADMIN'
}

export enum UserStatuses {
  Active = 'ACTIVE',
  InactiveByUser = 'INACTIVE_USER',
  InactiveByAdmin = 'INACTIVE_ADMIN'
}

export enum MembershipTypes {
  Owner = 'OWNER',
  Member = 'MEMBER',
  Pending = 'PENDING'
}
