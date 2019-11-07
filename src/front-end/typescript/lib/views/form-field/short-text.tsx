import { Dispatch, View } from 'front-end/lib/framework';
import * as FormField from 'front-end/lib/views/form-field/lib';
import * as Input from 'front-end/lib/views/form-field/lib/input';
import { default as React, KeyboardEventHandler } from 'react';

export type Value = string;

export interface State extends FormField.State<Value> {
  type: 'text' | 'email' | 'password';
  placeholder?: string;
}

type OnEnter = () => void;

interface ExtraProps {
  onKeyUp: KeyboardEventHandler<HTMLInputElement>;
  onChangeDebounced?: Input.OnChangeDebounced;
  inputClassName: string;
  autoFocus?: boolean;
}

export interface Props extends Pick<FormField.Props<State, ExtraProps, Value>, 'toggleHelp' | 'disabled' | 'onChange'> {
  state: State;
  onChangeDebounced?: Input.OnChangeDebounced;
  onEnter?: OnEnter;
  inputClassName?: string;
  autoFocus?: boolean
}

interface Params extends Pick<State, 'id' | 'required' | 'type' | 'label' | 'placeholder' | 'help'> {
  value?: Value;
}

export function init(params: Params): State {
  return {
    ...params,
    value: params.value || '',
    errors: []
  };
}

export function makeOnChange<Msg>(dispatch: Dispatch<Msg>, fn: (value: Value) => Msg): FormField.OnChange<Value> {
  return value => {
    dispatch(fn(value));
  };
}

function makeOnKeyUp(onEnter?: OnEnter): KeyboardEventHandler<HTMLInputElement> {
  return event => {
    if (event.key === 'Enter' && onEnter) { onEnter(); }
  };
};

const Child: View<FormField.ChildProps<State, ExtraProps, Value>> = props => {
  const { state, disabled, className, onChange, extraProps } = props;
  const inputClassName: string = extraProps.inputClassName || '';
  const autoFocus: boolean = !disabled && !!extraProps.autoFocus;
  return (
    <Input.View
      id={state.id}
      type={state.type}
      value={state.value}
      placeholder={state.placeholder}
      className={`${className} ${inputClassName} form-control`}
      disabled={disabled}
      autoFocus={autoFocus}
      onChange={event => onChange(event.currentTarget.value)}
      onChangeDebounced={extraProps.onChangeDebounced}
      onKeyUp={extraProps.onKeyUp} />
  );
};

export const view: View<Props> = ({ state, onChange, onChangeDebounced, onEnter, toggleHelp, disabled = false, inputClassName = '', autoFocus }) => {
  const extraProps: ExtraProps = {
    onKeyUp: makeOnKeyUp(onEnter),
    onChangeDebounced,
    inputClassName,
    autoFocus
  };
  return (
    <FormField.view
      Child={Child}
      state={state}
      onChange={onChange}
      toggleHelp={toggleHelp}
      extraProps={extraProps}
      disabled={disabled} />
  );
};
