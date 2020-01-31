import * as FormField from 'front-end/lib/components/form-field';
import * as Radio from 'front-end/lib/components/form-field/radio';
import { immutable, Immutable, mapComponentDispatch } from 'front-end/lib/framework';
import React from 'react';
import { adt, ADT } from 'shared/lib/types';

export type Value = boolean;

export interface ChildState extends FormField.ChildStateBase<Value> {
  radio: Immutable<Radio.State>;
  value: Value;
  id: any;
}

type ChildParams = FormField.ChildParamsBase<Value>;

type InnerChildMsg
  = ADT<'onChange'>;

type ExtraChildProps = {};

type ChildComponent = FormField.ChildComponent<Value, ChildParams, ChildState, InnerChildMsg, ExtraChildProps>;

export type State = FormField.State<Value, ChildState>;

export type Msg = FormField.Msg<InnerChildMsg>;

const childInit: ChildComponent['init'] = async params => {
  return {
    id: '',
    value: false,
    radio: immutable(await Radio.init({
      errors: [],
      child: {
        value: false,
        id: 'proposal-proponent-type'
      }
    }))
  };
};

const childUpdate: ChildComponent['update'] = ({ state, msg }) => {
  switch (msg.tag) {
    default:
      return [state];
  }
};

const ChildView: ChildComponent['view'] = (props) => {

  return (
    <Radio.view
      extraChildProps={{}}
      state={props.state.radio}
      dispatch={mapComponentDispatch(props.dispatch, value => adt('onChange' as const))}
    />
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
