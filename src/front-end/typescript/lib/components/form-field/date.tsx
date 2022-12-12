import * as FormField from "front-end/lib/components/form-field";
import { Immutable } from "front-end/lib/framework";
import { padStart } from "lodash";
import React from "react";
import { parseDate } from "shared/lib";
import { ADT } from "shared/lib/types";
import { mapValid, Validation } from "shared/lib/validation";

export type Value =
  | [number, number, number] // [YYYY, MM, DD]
  | null;

export function stringToValue(raw: string): Value {
  const match = raw.match(/^(\d\d\d\d)-(\d\d?)-(\d\d?)$/);
  if (!match) {
    return null;
  }
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return null;
  }
  return [year, month, day];
}

function prefixZero(n: number, nZeros: number): string {
  return padStart(String(n), nZeros, "0");
}

export function valueToString(value?: Value): string {
  return value
    ? `${prefixZero(value[0], 4)}-${prefixZero(value[1], 2)}-${prefixZero(
        value[2],
        2
      )}`
    : "";
}

export function getDate(state: Immutable<State>): Date | undefined {
  const s = valueToString(FormField.getValue(state));
  if (!s) {
    return undefined;
  }
  return parseDate(s) || undefined;
}

export function dateToValue(date: Date): Value {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()];
}

export function getValueAsString(state: Immutable<State>): string {
  return valueToString(FormField.getValue(state));
}

export function validateDate(
  validate: (_: string) => Validation<Date | null>
): (value: Value) => Validation<Value> {
  return (raw) => {
    const value = valueToString(raw);
    return mapValid(validate(value), () => raw);
  };
}

interface ChildState extends FormField.ChildStateBase<Value> {
  min?: Value;
  max?: Value;
}

type ChildParams = FormField.ChildParamsBase<Value> &
  Pick<ChildState, "min" | "max">;

type InnerChildMsg = ADT<"onChange", Value>;

type ExtraChildProps = Record<string, unknown>;

type ChildComponent = FormField.ChildComponent<
  Value,
  ChildParams,
  ChildState,
  InnerChildMsg,
  ExtraChildProps
>;

export type State = FormField.State<Value, ChildState>;

export type Params = FormField.Params<Value, ChildParams>;

export type Msg = FormField.Msg<InnerChildMsg>;

const childInit: ChildComponent["init"] = (params) => [params, []];

const childUpdate: ChildComponent["update"] = ({ state, msg }) => {
  switch (msg.tag) {
    case "onChange":
      return [state.set("value", msg.value), []];
    default:
      return [state, []];
  }
};

const ChildView: ChildComponent["view"] = (props) => {
  const {
    state,
    dispatch,
    className = "",
    validityClassName,
    disabled = false
  } = props;
  return (
    <input
      id={state.id}
      type="date"
      min={valueToString(state.min)}
      max={valueToString(state.max)}
      value={valueToString(state.value)}
      className={`form-control ${className} ${validityClassName}`}
      onChange={(e) => {
        const value = stringToValue(e.currentTarget.value);
        dispatch({ tag: "onChange", value });
        // Let the parent form field component know that the value has been updated.
        props.onChange(value);
      }}
      disabled={disabled}
    />
  );
};

export const component = FormField.makeComponent<
  Value,
  ChildParams,
  ChildState,
  InnerChildMsg,
  ExtraChildProps
>({
  init: childInit,
  update: childUpdate,
  view: ChildView
});

export const init = component.init;

export const update = component.update;

export const view = component.view;

export default component;
