import * as FormField from 'front-end/lib/components/form-field';
import React from 'react';
import { Spinner } from 'reactstrap';
import { CustomInput } from 'reactstrap';
import { ADT } from 'shared/lib/types';

export type Value = boolean;

type ChildState = FormField.ChildStateBase<Value>;

type ChildParams = FormField.ChildParamsBase<Value>;

type InnerChildMsg
  = ADT<'onChange', Value>;

interface ExtraChildProps {
  inlineLabel: string;
  loading?: boolean;
}

type ChildComponent = FormField.ChildComponent<Value, ChildParams, ChildState, InnerChildMsg, ExtraChildProps>;

export type State = FormField.State<Value, ChildState>;

export type Params = FormField.Params<Value, ChildParams>;

export type Msg = FormField.Msg<InnerChildMsg>;

const childInit: ChildComponent['init'] = async params => params;

const childUpdate: ChildComponent['update'] = ({ state, msg }) => {
  switch (msg.tag) {
    case 'onChange':
      return [state.set('value', msg.value)];
    default:
      return [state];
  }
};

const ChildView: ChildComponent['view'] = props => {
  const { state, dispatch, className = '', validityClassName, disabled = false, inlineLabel, loading = false } = props;
  return (
    <CustomInput
      id={state.id}
      name={state.id}
      checked={state.value}
      disabled={disabled}
      type='checkbox'
      label={inlineLabel}
      className={`d-flex align-items-center ${className} ${validityClassName}`}
      onChange={e => {
        const value = e.currentTarget.checked;
        dispatch({ tag: 'onChange', value });
        // Let the parent form field component know that the value has been updated.
        props.onChange(value);
      }}>
      {loading
        ? (<Spinner size='sm' color='secondary' className='ml-2' />)
        : null}
    </CustomInput>
  );
};

export const component = FormField.makeComponent<Value, ChildParams, ChildState, InnerChildMsg, ExtraChildProps>({
  init: childInit,
  update: childUpdate,
  view: ChildView
});

export const init = component.init;

export const update = component.update;

export const view = component.view;

export default component;
