import * as FormField from "front-end/lib/components/form-field";
import Select, {
  coalesceOptions,
  Option,
  Options,
  SingleProps,
  SingleValue
} from "front-end/lib/components/form-field/lib/select";
import { Immutable } from "front-end/lib/framework";
import { find } from "lodash";
import React from "react";
import { ADT } from "shared/lib/types";
import { InputGroup, InputGroupText } from "reactstrap";

export {
  stringsToOptions,
  objectToOptions,
  type Options,
  type OptionGroup,
  type Option
} from "front-end/lib/components/form-field/lib/select";

export type Value = SingleValue;

interface ChildState extends FormField.ChildStateBase<Value> {
  options: Options;
  creatable?: boolean;
  formatGroupLabel?: SingleProps["formatGroupLabel"];
}

type ChildParams = FormField.ChildParamsBase<Value> &
  Pick<ChildState, "options" | "creatable" | "formatGroupLabel">;

type InnerChildMsg = ADT<"onChange", Value>;

interface ExtraChildProps {
  loading?: boolean;
  prefix?: string;
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
    prefix,
    state,
    dispatch,
    placeholder = "",
    className = "",
    validityClassName,
    loading,
    disabled = false
  } = props;
  const selectProps: SingleProps = {
    name: state.id,
    id: state.id,
    placeholder,
    value: state.value,
    disabled,
    loading,
    options: state.options,
    className: `${className} ${validityClassName}`,
    onChange: (value) => {
      dispatch({ tag: "onChange", value });
      // Let the parent form field component know that the value has been updated.
      props.onChange(value);
    },
    formatGroupLabel: state.formatGroupLabel
  };
  if (!prefix) {
    return <Select {...selectProps} />;
  }
  return (
    <InputGroup>
      {prefix ? <InputGroupText>{prefix}</InputGroupText> : null}
      <Select {...selectProps} />
    </InputGroup>
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

export function setValueFromString(
  state: Immutable<ChildState>,
  value?: string
): Immutable<ChildState> {
  const options = coalesceOptions(state.options);
  const found: Option | null = find(options, { value }) || null;
  if (state.creatable && !found && value) {
    return {
      ...state,
      value: {
        value,
        label: value
      }
    };
  } else {
    return {
      ...state,
      value: found
    };
  }
}

/**
 * Converts the state object into a string value
 *
 * @param state
 * @returns string
 */
export function getValue(state: Immutable<State>): string {
  return state.child.value ? state.child.value.value : "";
}

export function setOptions(
  state: Immutable<State>,
  value: Options
): Immutable<State> {
  return state.update("child", (child) => child.set("options", value));
}
