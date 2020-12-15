import { APP_TERMS_CONTENT_ID } from 'front-end/config';
import { Route } from 'front-end/lib/app/types';
import * as FormField from 'front-end/lib/components/form-field';
import * as Checkbox from 'front-end/lib/components/form-field/checkbox';
import { Component, ComponentViewProps, immutable, Immutable, Init, mapComponentDispatch, Update, updateComponentChild, View } from 'front-end/lib/framework';
import Link, { routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { COPY } from 'shared/config';
import { ADT, adt } from 'shared/lib/types';

export interface State {
  proposal: Immutable<Checkbox.State>;
  app: Immutable<Checkbox.State>;
}

export type Msg
  = ADT<'proposal', Checkbox.Msg>
  | ADT<'app', Checkbox.Msg>;

export interface Params {
  proposal: Checkbox.Params;
  app: Checkbox.Params;
}

export const init: Init<Params, State> = async ({ proposal, app }) => {
  return {
    proposal: immutable(await Checkbox.init(proposal)),
    app: immutable(await Checkbox.init(app))
  };
};

export const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'proposal':
      return updateComponentChild({
        state,
        childStatePath: ['proposal'],
        childUpdate: Checkbox.update,
        childMsg: msg.value,
        mapChildMsg: v => adt('proposal', v) as Msg
      });
    case 'app':
      return updateComponentChild({
        state,
        childStatePath: ['app'],
        childUpdate: Checkbox.update,
        childMsg: msg.value,
        mapChildMsg: v => adt('app', v) as Msg
      });
  }
};

export function setProposalCheckbox(state: Immutable<State>, v: Checkbox.Value): Immutable<State> {
  return state.update('proposal', s => FormField.setValue(s, v));
}

export function getProposalCheckbox(state: Immutable<State>): Checkbox.Value {
  return FormField.getValue(state.proposal);
}

export function setAppCheckbox(state: Immutable<State>, v: Checkbox.Value): Immutable<State> {
  return state.update('app', s => FormField.setValue(s, v));
}

export function getAppCheckbox(state: Immutable<State>): Checkbox.Value {
  return FormField.getValue(state.app);
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
      <p>Please ensure you have reviewed the <Link newTab dest={routeDest(termsRoute)}>{termsTitle}</Link> and <Link newTab dest={routeDest(adt('contentView', APP_TERMS_CONTENT_ID))}>{COPY.appTermsTitle}</Link> prior to {action} your proposal for this {opportunityType} opportunity.</p>
      <Checkbox.view
        extraChildProps={{
          inlineLabel: (<span>I acknowledge that I have read, fully understand and agree to the <i>{termsTitle}</i>.</span>)
        }}
        className='font-weight-bold'
        state={state.proposal}
        dispatch={mapComponentDispatch(dispatch, v => adt('proposal', v) as Msg)} />
      <Checkbox.view
        extraChildProps={{
          inlineLabel: (<span>I acknowledge that I have read, fully understand and agree to the <i>{COPY.appTermsTitle}</i>.</span>)
        }}
        className='font-weight-bold'
        state={state.app}
        dispatch={mapComponentDispatch(dispatch, v => adt('app', v) as Msg)} />
    </div>
  );
};

export const component: Component<Params, State, Msg, Props> = {
  init,
  update,
  view
};

export default component;
