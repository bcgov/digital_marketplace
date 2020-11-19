import { Route } from 'front-end/lib/app/types';
import * as FormField from 'front-end/lib/components/form-field';
import * as Checkbox from 'front-end/lib/components/form-field/checkbox';
import { Component, ComponentView, Immutable } from 'front-end/lib/framework';
import Link, { routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { COPY } from 'shared/config';
import { adt } from 'shared/lib/types';

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

export const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  const termsRoute = adt('content', 'terms-and-conditions') as Route;
  return (
    <div>
      <p>Please ensure you have reviewed the latest version of the <Link newTab dest={routeDest(termsRoute)}>{COPY.appTermsTitle}</Link>.</p>
      <Checkbox.view
        extraChildProps={{
          inlineLabel: (<span>I acknowledge that I have read, fully understand and agree to the <i>{COPY.appTermsTitle}</i>.</span>)
        }}
        className='font-weight-bold'
        state={state}
        dispatch={dispatch} />
    </div>
  );
};

export const component: Component<Params, State, Msg> = {
  init,
  update,
  view
};

export default component;
