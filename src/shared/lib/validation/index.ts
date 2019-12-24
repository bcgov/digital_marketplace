import * as immutable from 'immutable';
import { isEmpty } from 'lodash';
import moment from 'moment';
import { compareDates, formatDate, formatDateAndTime, formatTime } from 'shared/lib';
import { ADT } from 'shared/lib/types';

export type ErrorTypeFrom<T> = {
  [p in keyof T]?: string[];
};

export interface Invalid<ErrorType> {
  invalid: ErrorType;
  valid: undefined;
}

export interface Valid<ValidT> {
  valid: ValidT;
  invalid: undefined;
}

export type Validation_<ValidT, ErrorT> = Valid<ValidT> | Invalid<ErrorT>;

export type Validation<Valid, Invalid = string[]>
  = ADT<'valid', Valid>
  | ADT<'invalid', Invalid>;

export type ArrayValidation<Value, Errors = string[]> = Validation<Value[], Errors[]>;

export function valid<Valid>(value: Valid): Validation<Valid, any> {
  return {
    tag: 'valid',
    value
  } as ADT<'valid', Valid>;
}

export function invalid<Invalid>(value: Invalid): Validation<any, Invalid> {
  return {
    tag: 'invalid',
    value
  } as ADT<'invalid', Invalid>;
}

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

export function mapValid<A, B, C>(value: Validation<A, C>, fn: (a: A) => B): Validation<B, C> {
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
    return valid(validations.map(({ value }) => value as B));
  } else {
    return invalid(validations.map(validation => getInvalidValue(validation, [])));
  }
}

// Single Value Validators.

// Validate a field only if it is truthy.
export function optional<Value, Valid, Invalid>(v: Value | undefined, validate: (v: Value) => Validation<Valid, Invalid>): Validation<Valid | undefined, Invalid> {
  return isEmpty(v) ? valid(undefined) : validate(v as Value);
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
