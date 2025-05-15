import * as FormField from "front-end/lib/components/form-field";
import { component as component_ } from "front-end/lib/framework";
import React from "react";
import { Spinner, Input, FormGroup, Label } from "reactstrap";
import { ADT } from "shared/lib/types";

export type Value = boolean;

type ChildState = FormField.ChildStateBase<Value>;

type ChildParams = FormField.ChildParamsBase<Value>;

type InnerChildMsg = ADT<"onChange", Value>;

interface ExtraChildProps {
  inlineLabel: string | component_.base.ViewElement;
  loading?: boolean;
  slimHeight?: boolean;
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
    dispatch,
    className = "",
    slimHeight,
    validityClassName,
    disabled = false,
    inlineLabel,
    loading = false
  } = props;

  const inputId = state.id;

  return (
    <FormGroup
      check
      inline={typeof inlineLabel === "string"}
      className={`${className} ${slimHeight ? "" : "h-input"}`}
      style={{ display: "flex", alignItems: "center" }}>
      <Input
        id={inputId}
        name={inputId}
        type="checkbox"
        checked={state.value}
        disabled={disabled || loading}
        className={validityClassName}
        onChange={(e) => {
          const value = e.currentTarget.checked;
          dispatch({ tag: "onChange", value });
          props.onChange(value);
        }}
      />
      <Label check for={inputId} className="ms-2 mb-0">
        {inlineLabel}
        {loading ? (
          <Spinner size="sm" color="secondary" className="ms-2" />
        ) : null}
      </Label>
    </FormGroup>
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
