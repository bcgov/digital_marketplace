import * as FormField from "front-end/lib/components/form-field";
import React from "react";
import { ADT } from "shared/lib/types";

export type Value = string;

interface ChildState extends FormField.ChildStateBase<Value> {
  type: "text" | "email";
}

type ChildParams = FormField.ChildParamsBase<Value> & Pick<ChildState, "type">;

type InnerChildMsg = ADT<"onChange", Value>;

interface ExtraChildProps {
  onEnter?(): void;
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

const childInit: ChildComponent["init"] = async (params) => params;

const childUpdate: ChildComponent["update"] = ({ state, msg }) => {
  switch (msg.tag) {
    case "onChange":
      return [state.set("value", msg.value)];
    default:
      return [state];
  }
};

const ChildView: ChildComponent["view"] = (props) => {
  const {
    state,
    dispatch,
    placeholder,
    className = "",
    validityClassName,
    disabled = false,
    onEnter
  } = props;
  return (
    <input
      id={state.id}
      type={state.type}
      value={state.value}
      placeholder={placeholder}
      className={`form-control ${className} ${validityClassName}`}
      onChange={(e) => {
        const value = e.currentTarget.value;
        dispatch({ tag: "onChange", value });
        // Let the parent form field component know that the value has been updated.
        props.onChange(value);
      }}
      onKeyUp={
        onEnter &&
        ((e) => {
          const code = e.keyCode || e.which;
          if (code === 13 && onEnter) {
            onEnter();
          }
        })
      }
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
