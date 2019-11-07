import { Dispatch, View } from 'front-end/lib/framework';
import * as FormField from 'front-end/lib/views/form-field/lib';
import * as TextArea from 'front-end/lib/views/form-field/lib/text-area';
import { CSSProperties, default as React, KeyboardEventHandler } from 'react';

export type Value = string;

export interface State extends FormField.State<Value> {
  placeholder?: string;
}

type OnEnter = () => void;

type OnChangeDebounced = () => void;

interface ExtraProps {
  onKeyUp: KeyboardEventHandler<HTMLTextAreaElement>;
  onChangeDebounced?: OnChangeDebounced;
  style?: CSSProperties;
  autoFocus?: boolean;
}

export interface Props extends Pick<FormField.Props<State, ExtraProps, Value>, 'toggleHelp' | 'disabled' | 'onChange' | 'className'> {
  state: State;
  onChangeDebounced?: OnChangeDebounced;
  onEnter?: OnEnter;
  style?: CSSProperties;
  autoFocus?: boolean;
}

interface Params extends Pick<State, 'id' | 'required' | 'label' | 'placeholder' | 'help'> {
  value?: string;
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

function makeOnKeyUp(onEnter?: OnEnter): KeyboardEventHandler<HTMLTextAreaElement> {
  return event => {
    if (event.key === 'Enter' && onEnter) { onEnter(); }
  };
};

const Child: View<FormField.ChildProps<State, ExtraProps, Value>> = props => {
  const { state, className, onChange, extraProps, disabled } = props;
  return (
    <TextArea.View
      id={state.id}
      value={state.value}
      placeholder={state.placeholder}
      className={`${className} form-control`}
      disabled={disabled}
      style={extraProps && extraProps.style}
      onChange={event => onChange(event.currentTarget.value)}
      onChangeDebounced={extraProps && extraProps.onChangeDebounced}
      onKeyUp={extraProps && extraProps.onKeyUp}
      autoFocus={extraProps && extraProps.autoFocus} />
  );
};

export const view: View<Props> = ({ state, onChange, onChangeDebounced, onEnter, toggleHelp, style, disabled = false, autoFocus, className }) => {
  const extraProps: ExtraProps = {
    onKeyUp: makeOnKeyUp(onEnter),
    onChangeDebounced,
    style,
    autoFocus
  };
  return (
    <FormField.view
      Child={Child}
      state={state}
      onChange={onChange}
      toggleHelp={toggleHelp}
      extraProps={extraProps}
      disabled={disabled}
      className={className} />
  );
};
