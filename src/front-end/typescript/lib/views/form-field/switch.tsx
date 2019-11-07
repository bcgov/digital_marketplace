import { Dispatch, View } from 'front-end/lib/framework';
import * as FormField from 'front-end/lib/views/form-field/lib';
import React from 'react';
import { CustomInput } from 'reactstrap';

export type Value = boolean;

export interface State extends FormField.State<Value> {
  inlineLabel: string;
}

type ExtraProps = null;

export interface Props extends Pick<FormField.Props<State, null, Value>, 'toggleHelp' | 'labelClassName' | 'disabled' | 'onChange'> {
  state: State;
}

type ChildProps = FormField.ChildProps<State, ExtraProps, Value>;

type InitParams = Pick<State, 'id' | 'value' | 'label' | 'help' | 'inlineLabel'>;

export function init(params: InitParams): State {
  return {
    ...params,
    errors: [],
    required: false
  };
}

export function makeOnChange<Msg>(dispatch: Dispatch<Msg>, fn: (value: Value) => Msg): FormField.OnChange<Value> {
  return value => {
    dispatch(fn(value));
  };
}

const Child: View<ChildProps> = props => {
  const { state, disabled, onChange, className } = props;
  return (
    <CustomInput
      id={state.id}
      name={state.id}
      checked={state.value}
      disabled={disabled}
      type='checkbox'
      label={state.inlineLabel}
      className={className}
      onChange={event => onChange(event.currentTarget.checked)} />
  );
};

export const view: View<Props> = ({ state, onChange, toggleHelp, labelClassName, disabled = false }) => {
  return (
    <FormField.view
      Child={Child}
      state={state}
      onChange={onChange}
      toggleHelp={toggleHelp}
      extraProps={null}
      disabled={disabled}
      labelClassName={labelClassName} />
  );
};
