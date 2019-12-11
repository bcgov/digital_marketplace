import * as FormField from 'front-end/lib/components/form-field';
import { Init, Update } from 'front-end/lib/framework';
import React from 'react';
import { ADT } from 'shared/lib/types';

export type Value
  = [number, number] // [HH, MM]
  | undefined;

export function stringToValue(raw: string): Value {
  const match = raw.match(/^(\d\d?)-(\d\d?)$/);
  if (!match) { return undefined; }
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (isNaN(hours) || isNaN(minutes)) { return undefined; }
  return [hours, minutes];
}

export function valueToString(value: Value): string | undefined {
  return value && `${value[0]}:${value[1]}`;
}

interface ChildState extends FormField.ChildStateBase<Value> {
  min?: Value;
  max?: Value;
}

type ChildParams = FormField.ChildParamsBase<Value> & Pick<ChildState, 'min' | 'max'>;

export type State = FormField.State<Value, ChildState>;

export type Params = FormField.Params<Value, ChildParams>;

type InnerChildMsg
  = ADT<'onChange', Value>;

export type Msg = FormField.Msg<InnerChildMsg>;

const childInit: Init<ChildParams, ChildState> = async params => params;

const childUpdate: Update<ChildState, FormField.ChildMsg<InnerChildMsg>> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'onChange':
      return [state.set('value', msg.value)];
    default:
      return [state];
  }
};

const ChildView: FormField.ChildView<Value, ChildState, InnerChildMsg> = props => {
  const { state, dispatch, className = '', validityClassName, disabled = false } = props;
  return (
    <input
      id={state.id}
      type='time'
      min={valueToString(state.min)}
      max={valueToString(state.max)}
      value={valueToString(state.value)}
      className={`form-control ${className} ${validityClassName}`}
      onChange={e => {
        const value = stringToValue(e.currentTarget.value);
        dispatch({ tag: 'onChange', value });
        // Let the parent form field component know that the value has been updated.
        props.onChange(value);
      }}
      disabled={disabled} />
  );
};

export const component = FormField.makeComponent({
  init: childInit,
  update: childUpdate,
  view: ChildView
});

export const init = component.init;

export const update = component.update;

export const view = component.view;

export default component;
