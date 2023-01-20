import { count } from "@wordpress/wordcount";
import { get, isArray, isBoolean, repeat } from "lodash";
import moment, { isDate, Moment } from "moment-timezone";
import { TIMEZONE } from "shared/config";
import { Comparison } from "shared/lib/types";
import { invalid, valid, Validation } from "shared/lib/validation";

export function find<T>(arr: T[], pred: (_: T) => boolean): T | null {
  for (const a of arr) {
    if (pred(a)) {
      return a;
    }
  }
  return null;
}

export const deslash = (s: string) => s.replace(/^\/*/, "").replace(/\/*$/, "");

export const prefix = (a: string) => (b: string) => {
  a = a && deslash(a);
  b = b && deslash(b);
  return `${a}${a && b ? "/" : ""}${b}`;
};

export function getString(
  obj: any,
  keyPath: string | string[],
  fallback = ""
): string {
  const value = get(obj, keyPath);
  return String(value === undefined || value === null ? fallback : value);
}

export function getStringArray(obj: any, keyPath: string | string[]): string[] {
  const value: any[] = get(obj, keyPath, []);
  if (!isArray(value)) {
    return [];
  }
  return value.map((v) => (v === undefined || value === null ? "" : String(v)));
}

export function getNumber<Fallback>(
  obj: any,
  keyPath: string | string[],
  fallback: number | Fallback = 0,
  integer = true
): number | Fallback {
  const raw = get(obj, keyPath);
  const result = integer ? parseInt(raw, 10) : parseFloat(raw);
  return isNaN(result) ? fallback : result;
}

export function getBoolean(
  obj: any,
  keyPath: string | string[],
  fallback = false
): boolean {
  const value = get(obj, keyPath);
  if (isBoolean(value)) {
    return value;
  } else {
    return fallback;
  }
}

export function getISODateString(obj: any, keyPath: string | string[]): string {
  const value = get(obj, keyPath);
  if (isDate(value)) {
    return value.toISOString();
  }
  return value;
}

export async function identityAsync<T>(a: T): Promise<T> {
  return a;
}

export type CurriedFunction<A, B, C> = (a: A) => (b: B) => C;

export function flipCurried<A, B, C>(
  fn: CurriedFunction<A, B, C>
): CurriedFunction<B, A, C> {
  return (b: B) => (a: A) => fn(a)(b);
}

export function getOrdinalSuffix(position: number): string {
  switch (position % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

export function formatAmount(
  amount: number,
  currency?: string,
  ordinal?: boolean,
  baseTenSeparator = 3,
  separator = ","
): string {
  const separateBy = 10 ** baseTenSeparator;
  let remaining = amount;
  let formatted = "";
  if (!remaining) {
    formatted = "0";
  }
  const prepend = (s: string | number) =>
    `${s}${formatted ? separator : ""}${formatted}`;
  while (remaining) {
    const remainder = remaining % separateBy;
    if (remainder) {
      let s = String(remainder);
      while (s.length < baseTenSeparator && remaining > separateBy) {
        s = "0" + s;
      }
      formatted = prepend(s);
    } else {
      formatted = prepend(repeat("0", baseTenSeparator));
    }
    remaining = Math.floor(remaining / separateBy);
  }
  if (currency) {
    formatted = `${currency}${formatted}`;
  }
  if (ordinal) {
    formatted = `${formatted}${getOrdinalSuffix(amount)}`;
  }
  return formatted;
}

export function parseDate(raw: string): Date | null {
  try {
    return normalizeDateTimezone(raw).toDate();
  } catch (e) {
    return null;
  }
}

export function normalizeDateTimezone(date: Date | string): Moment {
  return moment(date).tz(TIMEZONE);
}

export function rawFormatDate(
  date: Date,
  formatType: string,
  withTimeZone: boolean
): string {
  return normalizeDateTimezone(date).format(
    `${formatType}${withTimeZone ? " z" : ""}`
  );
}

export function formatDateAtTime(date: Date, withTimeZone = false): string {
  return `${formatDate(date)} at ${formatTime(date, withTimeZone)}`;
}

export function formatDateAndTime(date: Date, withTimeZone = false): string {
  return rawFormatDate(date, "lll", withTimeZone);
}

export function formatDate(date: Date, withTimeZone = false): string {
  return rawFormatDate(date, "ll", withTimeZone);
}

export function formatTime(date: Date, withTimeZone = false): string {
  return rawFormatDate(date, "LT", withTimeZone);
}

export function compareStrings(a: string, b: string): Comparison {
  return a
    .toLowerCase()
    .localeCompare(b.toLowerCase(), "en", { numeric: true }) as Comparison;
}

export function compareNumbers(a: number, b: number): Comparison {
  if (a < b) {
    return -1;
  } else if (a > b) {
    return 1;
  } else {
    return 0;
  }
}

export function compareDates(a: Date, b: Date): Comparison {
  return compareNumbers(
    normalizeDateTimezone(a).unix(),
    normalizeDateTimezone(b).unix()
  );
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

export function diffDates(
  a: Date,
  b: Date,
  unit: moment.unitOfTime.Diff
): number {
  return normalizeDateTimezone(a).diff(normalizeDateTimezone(b), unit, true);
}

export function addDays(date: Date, days: number): Date {
  return normalizeDateTimezone(date).add(days, "days").toDate();
}

export function setTime(
  date: Date,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0
): Date {
  return normalizeDateTimezone(new Date(date))
    .hour(hour)
    .minute(minute)
    .second(second)
    .millisecond(millisecond)
    .toDate();
}

export function setDateTo4PM(date: Date): Date {
  return setTime(date, 16);
}

export function formatTermsAndConditionsAgreementDate(
  date?: Date,
  you = "You",
  have = "have"
): string {
  if (date) {
    return `${you} agreed to the Terms and Conditions on ${formatDate(
      date
    )} at ${formatTime(date, true)}.`;
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
  return new Promise((resolve) => setTimeout(() => resolve(), ms));
}

export function countWords(raw: string): number {
  return count(raw, "words", {});
}

/**
 * Creates an array derived from a range of numbers with
 * the provided length. 
 *
 * @param length - length of the element array
 * @param offset - offset from the start
 * @param step - distance between values of the elements
 * @param cb - formats array elements
 * @returns Element[]
 */
export function arrayFromRange<Element = number>(
  length: number,
  {offset = 0, step = 1, cb = (number: number) => number as Element} = {}
): Element[] {
  return Array.from({length}, (_, i) => {
    const number = (i + offset) * step;
    return cb(number);
  })
}
