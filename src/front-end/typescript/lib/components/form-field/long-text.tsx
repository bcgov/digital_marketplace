import * as FormField from "front-end/lib/components/form-field";
import React, { CSSProperties } from "react";
import { ADT } from "shared/lib/types";

export type Value = string;

type ChildState = FormField.ChildStateBase<Value>;

type ChildParams = FormField.ChildParamsBase<Value>;

type InnerChildMsg = ADT<"onChange", Value>;

interface ExtraChildProps {
  style?: CSSProperties;
}

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
    style,
    dispatch,
    placeholder,
    className = "",
    validityClassName,
    disabled = false
  } = props;
  return (
    <textarea
      id={state.id}
      value={state.value}
      placeholder={placeholder}
      className={`form-control ${className} ${validityClassName}`}
      style={style}
      onChange={(e) => {
        const value = e.currentTarget.value;
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
