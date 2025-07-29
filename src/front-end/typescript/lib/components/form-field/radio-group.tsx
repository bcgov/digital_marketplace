import * as FormField from "front-end/lib/components/form-field";
import { Immutable } from "front-end/lib/framework";
import React from "react";
import { FormGroup, Input, Label } from "reactstrap";
import { ADT } from "shared/lib/types";

export interface Option<T> {
  label: string;
  value: T;
}

export type Value<T> = T | null;

export function isChecked<T>(state: Immutable<State<T>>): boolean {
  return FormField.getValue(state) !== null;
}

export function valueEquals<T>(state: Immutable<State<T>>, value: T): boolean {
  return FormField.getValue(state) === value;
}

interface ChildState<T> extends FormField.ChildStateBase<Value<T>> {
  options: Array<Option<T>>;
}

interface ChildParams<T>
  extends FormField.ChildParamsBase<Value<T>>,
    Pick<ChildState<T>, "options"> {}

type InnerChildMsg<T> = ADT<"onChange", Value<T>>;

interface ExtraChildProps {
  inline?: boolean;
}

type ChildComponent<T> = FormField.ChildComponent<
  Value<T>,
  ChildParams<T>,
  ChildState<T>,
  InnerChildMsg<T>,
  ExtraChildProps
>;

export type State<T> = FormField.State<Value<T>, ChildState<T>>;

export type Params<T> = FormField.Params<Value<T>, ChildParams<T>>;

export type Msg<T> = FormField.Msg<InnerChildMsg<T>>;

function makeChildInit<T>(): ChildComponent<T>["init"] {
  return (params) => [params, []];
}

function makeChildUpdate<T>(): ChildComponent<T>["update"] {
  return ({ state, msg }) => {
    switch (msg.tag) {
      case "onChange":
        return [state.set("value", msg.value), []];
      default:
        return [state, []];
    }
  };
}

function makeChildView<T>(): ChildComponent<T>["view"] {
  return function CustomInputWrapper(props) {
    const {
      state,
      dispatch,
      className = "",
      validityClassName,
      disabled = false,
      inline = false
    } = props;
    return (
      <div
        className={`${className} mb-n3 d-flex flex-column ${
          inline ? "flex-sm-row flex-sm-wrap align-items-sm-center" : ""
        }`}>
        {state.options.map((option, i) => (
          <FormGroup
            key={`${state.id}-${i}`}
            check
            inline={inline}
            className={`mb-3 ${inline ? "me-sm-3" : ""}`}>
            <Input
              id={`${state.id}-${i}`}
              name={state.id}
              checked={
                state.value === null ? false : state.value === option.value
              }
              disabled={disabled}
              type="radio"
              className={validityClassName}
              onChange={(e) => {
                if (e.currentTarget.checked) {
                  dispatch({ tag: "onChange", value: option.value });
                  props.onChange(option.value);
                }
              }}
            />{" "}
            <Label check htmlFor={`${state.id}-${i}`}>
              {option.label}
            </Label>
          </FormGroup>
        ))}
      </div>
    );
  };
}

export function makeComponent<T>(): FormField.Component<
  Value<T>,
  ChildParams<T>,
  ChildState<T>,
  InnerChildMsg<T>,
  ExtraChildProps
> {
  return FormField.makeComponent<
    Value<T>,
    ChildParams<T>,
    ChildState<T>,
    InnerChildMsg<T>,
    ExtraChildProps
  >({
    init: makeChildInit(),
    update: makeChildUpdate(),
    view: makeChildView()
  });
}

export default makeComponent;
