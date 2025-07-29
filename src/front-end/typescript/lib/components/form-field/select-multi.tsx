import * as FormField from "front-end/lib/components/form-field";
import Select, {
  coalesceOptions,
  MultiProps,
  MultiValue,
  Option,
  Options
} from "front-end/lib/components/form-field/lib/select";
import { Immutable } from "front-end/lib/framework";
import { find } from "lodash";
import React from "react";
import { ADT } from "shared/lib/types";

export {
  stringsToOptions,
  type Options,
  type OptionGroup,
  type Option
} from "front-end/lib/components/form-field/lib/select";

export type Value = MultiValue;

interface ChildState extends FormField.ChildStateBase<Value> {
  options: Options;
  creatable?: boolean;
  formatGroupLabel?: MultiProps["formatGroupLabel"];
}

type ChildParams = FormField.ChildParamsBase<Value> &
  Pick<ChildState, "options" | "creatable" | "formatGroupLabel">;

type InnerChildMsg = ADT<"onChange", Value>;

interface ExtraChildProps {
  loading?: boolean;
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
    placeholder = "",
    className = "",
    validityClassName,
    loading,
    disabled = false
  } = props;
  const selectProps: MultiProps = {
    multi: true,
    creatable: state.creatable,
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
  return <Select {...selectProps} />;
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

export function getValueAsStrings(state: Immutable<State>): string[] {
  const value = FormField.getValue(state);
  return value ? value.map(({ value }) => value) : [];
}

export function setValueFromStrings(
  state: Immutable<State>,
  values?: string[]
): Immutable<State> {
  const options = coalesceOptions(state.child.options);
  if (!values) {
    return state;
  }
  state = FormField.setValue(state, []);
  return values.reduce((state, value) => {
    const found: Option | null = find(options, { value }) || null;
    if (state.child.creatable && !found && value) {
      return FormField.updateValue(state, (vs) =>
        vs.concat({
          value,
          label: value
        })
      );
    } else if (found) {
      return FormField.updateValue(state, (vs) => vs.concat(found));
    } else {
      return state;
    }
  }, state);
}
