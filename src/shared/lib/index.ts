import { get, isArray, isBoolean, repeat } from 'lodash';
import moment from 'moment-timezone';
import { invalid, valid, Validation } from 'shared/lib/validation';

export function getString(obj: any, keyPath: string | string[], fallback = ''): string {
  const value = get(obj, keyPath);
  return String(value === undefined || value === null ? fallback : value);
}

export function getStringArray(obj: any, keyPath: string | string[]): string[] {
  const value: any[] = get(obj, keyPath, []);
  if (!isArray(value)) { return []; }
  return value.map(v => v === undefined || value === null ? '' : String(v));
}

export function getNumber<Fallback>(obj: any, keyPath: string | string[], fallback: number | Fallback = 0, integer = true): number | Fallback {
  const raw = get(obj, keyPath);
  const result = integer ? parseInt(raw, 10) : parseFloat(raw);
  return isNaN(result) ? fallback : result;
}

export function getBoolean(obj: any, keyPath: string | string[], fallback = false): boolean {
  const value = get(obj, keyPath);
  if (isBoolean(value)) {
    return value;
  } else {
    return fallback;
  }
}

export async function identityAsync<T>(a: T): Promise<T> {
  return a;
}

export type CurriedFunction<A, B, C> = (a: A) => (b: B) => C;

export function flipCurried<A, B, C>(fn: CurriedFunction<A, B, C>): CurriedFunction<B, A, C> {
  return (b: B) => (a: A) => fn(a)(b);
}

export function formatAmount(amount: number, currency?: string, baseTenSeparator = 3, separator = ','): string {
  const separateBy = 10 ** baseTenSeparator;
  let remaining = amount;
  let formatted = '';
  if (!remaining) {
    formatted = '0';
  }
  const prepend = (s: string | number) => `${s}${formatted ? separator : ''}${formatted}`;
  while (remaining) {
    const remainder = remaining % separateBy;
    remaining = Math.floor(remaining / separateBy);
    if (remainder) {
      formatted = prepend(remainder);
    } else {
      formatted = prepend(repeat('0', baseTenSeparator));
    }
  }
  if (currency) {
    formatted = `${currency} ${formatted}`;
  }
  return formatted;
}

const TIMEZONE = 'America/Vancouver';

export function rawFormatDate(date: Date, formatType: string, withTimeZone: boolean): string {
  return moment(date).tz(TIMEZONE).format(`${formatType}${withTimeZone ? ' z' : ''}`);
}

export function formatDateAndTime(date: Date, withTimeZone = false): string {
  return rawFormatDate(date, 'lll', withTimeZone);
}

export function formatDate(date: Date, withTimeZone = false): string {
  return rawFormatDate(date, 'll', withTimeZone);
}

export function formatTime(date: Date, withTimeZone = false): string {
  return rawFormatDate(date, 'LT', withTimeZone);
}

export function compareDates(a: Date, b: Date): -1 | 0 | 1 {
  const epochA = a.getTime();
  const epochB = b.getTime();
  if (epochA < epochB) {
    return -1;
  } else if (epochA > epochB) {
    return 1;
  } else {
    return 0;
  }
}

export function isDateInThePast(date: Date): boolean {
  return compareDates(date, new Date()) === -1;
}

export function isDateThePresent(date: Date): boolean {
  return compareDates(date, new Date()) === 0;
}

export function isDateInTheFuture(date: Date): boolean {
  return compareDates(date, new Date()) === 1;
}

export function diffDates(a: Date, b: Date, unit: moment.unitOfTime.Diff): number {
  return moment(a).diff(moment(b), unit, true);
}

export function addDays(date: Date, days: number): Date {
  return moment(date).add(days, 'days').toDate();
}

export function formatTermsAndConditionsAgreementDate(date?: Date, you = 'You', have = 'have'): string {
  if (date) {
    return `${you} agreed to the Terms and Conditions on ${formatDate(date)} at ${formatTime(date, true)}.`;
  } else {
    return `${you} ${have} not agreed to the Terms & Conditions.`;
  }
}

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

export function bytesToMegabytes(bytes: number): number {
  return bytes / 1024 / 1024;
}

export function megabytesToBytes(megabytes: number): number {
  return megabytes * 1024 * 1024;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}
