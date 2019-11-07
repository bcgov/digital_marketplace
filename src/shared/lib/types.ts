import { compareDates } from 'shared/lib';

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

export type Id = string;

export enum IssuerType {
  Google = 'GOOGLE'
}

export interface User {
  id: Id;
  name: string;
  email: string;
  issuerUid: string;
  issuerType: IssuerType;
}

export interface Librarian {
  email: string;
}

export type SessionUser
  = ADT<'user', User>
  | ADT<'librarian', Librarian>;

export interface Session {
  id: Id;
  issuerRequestState?: string;
  user?: SessionUser;
}

export interface Author {
  id: Id;
  firstName: string;
  middleName?: string;
  lastName: string;
  createdAt: Date;
}

export function authorToFullName(author: Author): string {
  return `${author.firstName}${author.middleName ? ` ${author.middleName}` : ''} ${author.lastName}`;
}

export interface Genre {
  name: string;
  subscribed?: boolean; // Defined for Users only.
}

export interface Book {
  id: Id;
  title: string;
  description: string;
  authors: Author[];
  genre: Genre;
  loan?: Loan; // Defined for librarians only.
  loanStatus?: LoanStatus;
  subscribed?: boolean; // Defined for Users only.
  createdAt: Date;
}

export interface Loan {
  id: Id;
  createdAt: Date;
  dueAt: Date;
  returnedAt?: Date;
  bookId: Id;
}

export type LoanStatus
  = 'outstanding'
  | 'overdue'
  | 'returned';

export function loanToLoanStatus(loan: Loan): LoanStatus {
  if (loan.returnedAt) { return 'returned'; }
  const isOverdue = compareDates(new Date(loan.dueAt), new Date()) <= 0;
  if (isOverdue) { return 'overdue'; }
  return 'outstanding';
}
