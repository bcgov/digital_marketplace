import * as immutable from 'immutable';
import { isEmpty, uniq } from 'lodash';
import moment from 'moment';
import { compareDates, formatAmount, formatDate, formatDateAndTime, formatTime } from 'shared/lib';
import CAPABILITIES from 'shared/lib/data/capabilities';
import { adt, ADT, Id } from 'shared/lib/types';

export type ErrorTypeFrom<T> = {
  [p in keyof T]?: string[];
};

export type Valid<T> = ADT<'valid', T>;

export function valid<T>(value: T): Valid<T> {
  return adt('valid', value);
}

export type Invalid<T> = ADT<'invalid', T>;

export function invalid<T>(value: T): Invalid<T> {
  return adt('invalid', value);
}

export type Validation<A, B = string[]>
  = Valid<A>
  | Invalid<B>;

export type ArrayValidation<Value, Errors = string[]> = Validation<Value[], Errors[]>;

export function isValid<Valid>(value: Validation<Valid, any>): value is ADT<'valid', Valid> {
  return value.tag === 'valid';
}

export function isInvalid<Invalid>(value: Validation<any, Invalid>): value is ADT<'invalid', Invalid> {
  return value.tag === 'invalid';
}

export function allValid(results: Array<Validation<any, any>>): results is Array<ADT<'valid', any>> {
  for (const result of results) {
    if (result.tag === 'invalid') {
      return false;
    }
  }
  return true;
}

export function allInvalid(results: Array<Validation<any, any>>): results is Array<ADT<'invalid', any>> {
  for (const result of results) {
    if (result.tag === 'valid') {
      return false;
    }
  }
  return true;
}

export function getValidValue<Valid, Fallback = Valid>(result: Validation<Valid, any>, fallback: Fallback): Valid | Fallback {
  switch (result.tag) {
    case 'valid':
      return result.value;
    case 'invalid':
      return fallback;
  }
}

export function getInvalidValue<Invalid, Fallback = Invalid>(result: Validation<any, Invalid>, fallback: Fallback): Invalid | Fallback {
  switch (result.tag) {
    case 'valid':
      return fallback;
    case 'invalid':
      return result.value;
  }
}

export function mapValid<A, B, C>(value: Validation<A, B>, fn: (b: A) => C): Validation<C, B> {
  switch (value.tag) {
    case 'valid':
      return valid(fn(value.value));
    case 'invalid':
      return value;
  }
}

export function mapInvalid<A, B, C>(value: Validation<A, B>, fn: (b: B) => C): Validation<A, C> {
  switch (value.tag) {
    case 'valid':
      return value;
    case 'invalid':
      return invalid(fn(value.value));
  }
}

export function validateThenMapValid<A, B, C>(validate: (_: A) => Validation<A, B>, fn: (_: A) => C): (_: A) => Validation<C, B> {
  return a => mapValid(validate(a), fn);
}

export function validateThenMapInvalid<A, B, C>(validate: (_: A) => Validation<A, B>, fn: (_: B) => C): (_: A) => Validation<A, C> {
  return a => mapInvalid(validate(a), fn);
}

// Array Validators.

export function validateArrayCustom<A, B, C>(raw: A[], validate: (v: A) => Validation<B, C>, defaultInvalidValue: C): ArrayValidation<B, C> {
  const validations = raw.map(v => validate(v));
  if (allValid(validations)) {
    return valid(validations.map(({ value }) => value));
  } else {
    return invalid(validations.map(validation => getInvalidValue(validation, defaultInvalidValue)));
  }
}

export function validateArray<A, B>(raw: A[], validate: (v: A) => Validation<B>): ArrayValidation<B> {
  return validateArrayCustom(raw, validate, []);
}

export async function validateArrayAsync<A, B>(raw: A[], validate: (v: A) => Promise<Validation<B>>): Promise<ArrayValidation<B>> {
  const validations = await Promise.all(raw.map(v => validate(v)));
  if (allValid(validations)) {
    return valid<B[]>(validations.map(({ value }) => value));
  } else {
    return invalid<string[][]>(validations.map(validation => getInvalidValue(validation, [])));
  }
}

export async function validateArrayCustomAsync<A, B, C>(raw: A[], validate: (v: A) => Promise<Validation<B, C>>, defaultInvalidValue: C): Promise<ArrayValidation<B, C>> {
  const validations = await Promise.all(raw.map(v => validate(v)));
  if (allValid(validations)) {
    return valid(validations.map(({ value }) => value));
  } else {
    return invalid(validations.map(validation => getInvalidValue(validation, defaultInvalidValue)));
  }
}

// Single Value Validators.

// Validate a field only if it is truthy.
export function optional<Value, Valid, Invalid>(v: Value | undefined, validate: (v: Value) => Validation<Valid, Invalid>): Validation<Valid | undefined, Invalid> {
  return isEmpty(v) ? valid(undefined) : validate(v as Value);
}

export async function optionalAsync<Value, Valid, Invalid>(v: Value | undefined, validate: (v: Value) => Promise<Validation<Valid, Invalid>>): Promise<Validation<Valid | undefined, Invalid>> {
  return isEmpty(v) ? valid<undefined>(undefined) : await validate(v as Value);
}

export function validateGenericString(value: string, name: string, min = 1, max = 100, characters = 'characters'): Validation<string> {
  if (value.length < min || value.length > max) {
    return invalid([`${name} must be between ${min} and ${max} ${characters} long.`]);
  } else {
    return valid(value);
  }
}

export function validateStringInArray(value: string, availableValues: immutable.Set<string>, name: string, indefiniteArticle = 'a', caseSensitive = false): Validation<string> {
  if (!value) {
    return invalid([`Please select ${indefiniteArticle} ${name}`]);
  }
  if (!caseSensitive) {
    availableValues = availableValues.map(v => v.toUpperCase());
    value = value.toUpperCase();
  }
  if (!availableValues.includes(value)) {
    return invalid([`"${value}" is not a valid ${name}.`]);
  } else {
    return valid(value);
  }
}

export function validateNumber(raw: string | number, min?: number, max?: number, name = 'number', article = 'a', format = true, integer = true): Validation<number> {
  const parsed = integer ? parseInt(`${raw}`, 10) : parseFloat(`${raw}`);
  if (isNaN(parsed)) { return invalid([`Please enter a valid ${name}.`]); }
  const errors: string[] = [];
  if (min !== undefined && parsed < min) {
    errors.push(`Please enter ${article} ${name} greater than or equal to ${format ? formatAmount(min) : min}.`);
  }
  if (max !== undefined && parsed > max) {
    errors.push(`Please enter ${article} ${name} less than or equal to ${format ? formatAmount(max) : max}.`);
  }
  if (errors.length) {
    return invalid(errors);
  }
  return valid(parsed);
}

// Date Validators.

function parseDate(raw: string): Date | null {
  const parsed = moment(raw);
  return parsed.isValid() ? parsed.toDate() : null;
}

export function validateGenericDate(raw: string, name: string, preposition: string, format: (d: Date) => string, minDate?: Date, maxDate?: Date): Validation<Date> {
  const date: Date | null = parseDate(raw);
  if (!date) {
    return invalid(['Please enter a valid date.']);
  }
  const validMinDate = !minDate || compareDates(date, minDate) !== -1;
  const validMaxDate = !maxDate || compareDates(date, maxDate) !== 1;
  if (validMinDate && validMaxDate) {
    return valid(date);
  } else {
    const errors: string[] = [];
    if (!validMinDate && minDate) {
      errors.push(`Please select a ${name} ${preposition ? `${preposition} or ` : ''}after ${format(minDate)}`);
    }
    if (!validMaxDate && maxDate) {
      errors.push(`Please select a ${name} ${preposition ? `${preposition} or ` : ''}earlier than ${format(maxDate)}`);
    }
    return invalid(errors);
  }
}

export function validateDatetime(raw: string, minDate?: Date, maxDate?: Date): Validation<Date> {
  return validateGenericDate(raw, 'date/time', 'at', formatDateAndTime, minDate, maxDate);
}

export function validateDate(raw: string, minDate?: Date, maxDate?: Date): Validation<Date> {
  return validateGenericDate(raw, 'date', 'on', formatDate, minDate, maxDate);
}

export function validateTime(raw: string, minDate?: Date, maxDate?: Date): Validation<Date> {
  return validateGenericDate(raw, 'time', 'at', formatTime, minDate, maxDate);
}

export function validateUrl(url: string): Validation<string> {
  url = url.toLowerCase();
  if (!url.match(/(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/i)) {
    return invalid(['Please enter a valid URL.']);
  } else {
    return valid(url);
  }
}

export function validatePhoneNumber(phone: string): Validation<string> {
  if (!phone.match(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/i)) {
    return invalid(['Please enter a valid phone number.']);
  } else {
    return valid(phone);
  }
}

export function validateEmail(email: string): Validation<string> {
  email = email.toLowerCase();
  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/i)) {
    return invalid([ 'Please enter a valid email.' ]);
  } else {
    return valid(email);
  }
}

// Validates a v4 UUID
export function validateUUID(raw: string): Validation<Id> {
  if (!raw.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) {
    return invalid(['Invalid identifier provided.']);
  } else {
    return valid(raw);
  }
}

// Validate capabilities for SWU opportunities and proposals
export function validateCapability(raw: string): Validation<string> {
  return CAPABILITIES.includes(raw) ? valid(raw) : invalid(['Please select a capability from the list.']);
}

export function validateCapabilities(raw: string[]): ArrayValidation<string> {
  if (!raw.length) { return invalid([['Please select at least one capability.']]); }
  const validatedArray = validateArray(raw, validateCapability);
  return mapValid(validatedArray, v => uniq(v));
}
