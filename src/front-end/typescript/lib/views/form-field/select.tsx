import { Dispatch, View } from 'front-end/lib/framework';
import * as FormField from 'front-end/lib/views/form-field/lib';
import { default as Select, Option, Options, Props as SelectProps, Value } from 'front-end/lib/views/form-field/lib/select';
import { default as SelectCreatable } from 'front-end/lib/views/form-field/lib/select-creatable';
import { find } from 'lodash';
import React from 'react';

export { Options, OptionGroup, Option, Value } from 'front-end/lib/views/form-field/lib/select';

export function setValue(state: State, value?: string): State {
  let options: Option[] = [];
  switch (state.options.tag) {
    case 'options':
      options = state.options.value;
      break;
    case 'optionGroups':
      options = state.options.value.reduce<Option[]>((acc, { options }) => [...acc, ...options], []);
      break;
  }
  const found = find(options, { value }) || null;
  if (state.isCreatable && !found && value) {
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

export interface State extends FormField.State<Value> {
  options: Options;
  placeholder: string;
  isCreatable?: boolean;
}

interface ExtraProps extends Pick<State, 'isCreatable'> {
  formatGroupLabel?: SelectProps['formatGroupLabel'];
}

export interface Props extends Pick<FormField.Props<State, ExtraProps, Value>, 'toggleHelp' | 'disabled' | 'onChange'> {
  state: State;
  formatGroupLabel?: SelectProps['formatGroupLabel'];
}

type ChildProps = FormField.ChildProps<State, ExtraProps, Value>;

interface InitParams extends Pick<State, 'id' | 'required' | 'label' | 'help' | 'options' | 'placeholder' | 'isCreatable'> {
  value?: State['value'];
}

export function init(params: InitParams): State {
  return {
    ...params,
    errors: [],
    value: params.value
  };
}

export function makeOnChange<Msg>(dispatch: Dispatch<Msg>, fn: (value: Value) => Msg): FormField.OnChange<Value> {
  return value => {
    dispatch(fn(value));
  };
}

const Child: View<ChildProps> = props => {
  const { state, disabled, className, onChange, extraProps } = props;
  const selectProps: SelectProps = {
    name: state.id,
    id: state.id,
    placeholder: state.placeholder,
    value: state.value,
    disabled,
    options: state.options,
    className,
    onChange,
    formatGroupLabel: extraProps.formatGroupLabel
  };
  return extraProps.isCreatable ? (<SelectCreatable {...selectProps} />) : (<Select {...selectProps} />);
};

export const view: View<Props> = ({ state, onChange, toggleHelp, disabled, formatGroupLabel }) => {
  return (
    <FormField.view
      Child={Child}
      state={state}
      onChange={onChange}
      toggleHelp={toggleHelp}
      extraProps={{ isCreatable: state.isCreatable, formatGroupLabel }}
      disabled={disabled} />
  );
};
