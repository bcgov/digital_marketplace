import * as FormField from "front-end/lib/components/form-field";
import Icon from "front-end/lib/views/icon";
import React from "react";
import { adt, ADT } from "shared/lib/types";

export type Value = string[];

interface ChildState extends FormField.ChildStateBase<Value> {
  type: "text" | "email";
}

type ChildParams = FormField.ChildParamsBase<Value> & Pick<ChildState, "type">;

type InnerChildMsg =
  | ADT<
      "onChange",
      { index: number; value: string; onChange: FormField.OnChange<Value> }
    > //[index, value]
  | ADT<"add", { onChange: FormField.OnChange<Value> }>
  | ADT<"remove", { index: number; onChange: FormField.OnChange<Value> }>;

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
      return [
        state.update("value", (vs) => {
          vs = vs.map((v, i) => {
            return i === msg.value.index ? msg.value.value : v;
          });
          msg.value.onChange(vs);
          return vs;
        }),
        []
      ];
    case "add":
      return [
        state.update("value", (vs) => {
          vs = [...vs, ""];
          msg.value.onChange(vs);
          return vs;
        }),
        []
      ];
    case "remove":
      return [
        state.update("value", (vs) => {
          vs = vs.filter((v, i) => i !== msg.value.index);
          msg.value.onChange(vs);
          return vs;
        }),
        []
      ];
    default:
      return [state, []];
  }
};

const ChildView: ChildComponent["view"] = (props) => {
  const {
    onChange,
    state,
    dispatch,
    placeholder,
    className = "",
    validityClassName,
    disabled = false
  } = props;
  return (
    <div>
      {state.value.map((v, i) => {
        return (
          <div key={`${state.id}-${i}`}>
            <input
              id={`${state.id}-${i}`}
              type={state.type}
              value={state.value}
              placeholder={placeholder}
              className={`form-control ${className} ${validityClassName} ${
                i < state.value.length - 1 ? "mb-3" : ""
              }`}
              onChange={(e) => {
                const value = e.currentTarget.value;
                dispatch(
                  adt("onChange", {
                    index: i,
                    value,
                    onChange
                  })
                );
              }}
              disabled={disabled}
            />
            <Icon
              hover={!disabled}
              name="trash"
              color={disabled ? "secondary" : "info"}
              className="ms-2"
              onClick={() =>
                !disabled &&
                dispatch(
                  adt("remove", {
                    index: i,
                    onChange
                  })
                )
              }
            />
            {i === state.value.length - 1 ? (
              <Icon
                hover={!disabled}
                name="plus"
                color={disabled ? "secondary" : "primary"}
                className="ms-2"
                onClick={() => !disabled && dispatch(adt("add", { onChange }))}
              />
            ) : null}
          </div>
        );
      })}
    </div>
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
