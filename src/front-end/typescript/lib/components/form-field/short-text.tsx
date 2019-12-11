import * as FormField from 'front-end/lib/components/form-field';
import { Init, Update } from 'front-end/lib/framework';
import React from 'react';
import { ADT } from 'shared/lib/types';

export type Value = string;

interface ChildState extends FormField.ChildStateBase<Value> {
  type: 'text' | 'email';
}

type ChildParams = FormField.ChildParamsBase<Value> & Pick<ChildState, 'type'>;

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
  const { state, dispatch, placeholder, className = '', validityClassName, disabled = false } = props;
  return (
    <input
      id={state.id}
      type={state.type}
      value={state.value}
      placeholder={placeholder}
      className={`form-control ${className} ${validityClassName}`}
      onChange={e => {
        const value = e.currentTarget.value;
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
