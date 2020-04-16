import { Route } from 'front-end/lib/app/types';
import * as FormField from 'front-end/lib/components/form-field';
import * as Checkbox from 'front-end/lib/components/form-field/checkbox';
import { Component, ComponentViewProps, Immutable, View } from 'front-end/lib/framework';
import Link, { routeDest } from 'front-end/lib/views/link';
import React from 'react';

export type State = Checkbox.State;
export type Msg = Checkbox.Msg;
export type Params = Checkbox.Params;

export const init = Checkbox.init;
export const update = Checkbox.update;

export function setCheckbox(state: Immutable<State>, v: Checkbox.Value): Immutable<State> {
  return FormField.setValue(state, v);
}

export function getCheckbox(state: Immutable<State>): Checkbox.Value {
  return FormField.getValue(state);
}

export interface Props extends ComponentViewProps<State, Msg> {
  opportunityType: 'Sprint With Us' | 'Code With Us';
  action: 'submitting' | 'submitting changes to';
  termsTitle: string;
  termsRoute: Route;
}

export const view: View<Props> = ({ opportunityType, action, termsTitle, termsRoute, state, dispatch }) => {
  return (
    <div>
      <p>Please ensure you have reviewed the <Link newTab dest={routeDest(termsRoute)}>{termsTitle}</Link> prior to {action} your proposal for this {opportunityType} opportunity.</p>
      <Checkbox.view
        extraChildProps={{
          inlineLabel: (<span>I acknowledge that I have read, fully understand and agree to the <Link newTab dest={routeDest(termsRoute)}>{termsTitle}</Link>.</span>)
        }}
        className='font-weight-bold'
        state={state}
        dispatch={dispatch} />
    </div>
  );
};

export const component: Component<Params, State, Msg, Props> = {
  init,
  update,
  view
};

export default component;
