import { makeStartLoading, makeStopLoading } from 'front-end/lib';
import { Route } from 'front-end/lib/app/types';
import * as FormField from 'front-end/lib/components/form-field';
import * as Checkbox from 'front-end/lib/components/form-field/checkbox';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, Init, mapComponentDispatch, Update, updateComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Tab from 'front-end/lib/pages/user/profile/tab';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { adt, ADT } from 'shared/lib/types';

export interface State extends Tab.Params {
  newOpportunitiesLoading: number;
  newOpportunities: Immutable<Checkbox.State>;
}

export type InnerMsg
  = ADT<'newOpportunities', Checkbox.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

const init: Init<Tab.Params, State> = async ({ viewerUser, profileUser }) => {
  return {
    profileUser,
    viewerUser,
    newOpportunitiesLoading: 0,
    newOpportunities: immutable(await Checkbox.init({
      errors: [],
      child: {
        value: !!profileUser.notificationsOn,
        id: 'user-notifications-new-opportunities'
      }
    }))
  };
};

const startNewOpportunitiesLoading = makeStartLoading<State>('newOpportunitiesLoading');
const stopNewOpportunitiesLoading = makeStopLoading<State>('newOpportunitiesLoading');

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'newOpportunities':
      const valueChanged = msg.value.tag === 'child' && msg.value.value.tag === 'onChange';
      const newOppResult = updateComponentChild({
        state,
        childStatePath: ['newOpportunities'],
        childUpdate: Checkbox.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('newOpportunities' as const, value)
      });
      if (!valueChanged) { return newOppResult; }
      // Checkbox value has changed, so persist to back-end.
      return [
        startNewOpportunitiesLoading(newOppResult[0]),
        async (state, dispatch) => {
          // Ensure async updates from child component have been run.
          if (newOppResult[1]) {
            const newState = await newOppResult[1](state, dispatch);
            state = newState || state;
          }
          // Persist change to back-end.
          state = stopNewOpportunitiesLoading(state);
          const result = await api.users.update(state.profileUser.id, adt('updateNotifications', FormField.getValue(state.newOpportunities)));
          if (api.isValid(result)) {
            state = state
              .set('profileUser', result.value)
              .update('newOpportunities', v => FormField.setValue(v, !!result.value.notificationsOn));
          } else {
            state = state
              .update('newOpportunities', v => FormField.setValue(v, !!state.profileUser.notificationsOn));
          }
          return state;
        }
      ];
    default:
      return [state];
  }
};

const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  const isNewOpportunitiesLoading = state.newOpportunitiesLoading > 0;
  const isLoading = isNewOpportunitiesLoading;
  return (
    <div>
      <Row className='mb-4'>
        <Col xs='12'>
          <h2>Notifications</h2>
          <p>Email notifications will be sent to <b>{state.profileUser.email}</b> for the options selected below. If this email address is incorrect please update your profile.</p>
        </Col>
      </Row>
      <Row>
        <Col xs='12'>
          <Checkbox.view
            extraChildProps={{
              inlineLabel: 'New opportunities.',
              loading: isNewOpportunitiesLoading
            }}
            label='Notify me about...'
            disabled={isLoading}
            state={state.newOpportunities}
            dispatch={mapComponentDispatch(dispatch, value => adt('newOpportunities' as const, value))} />
        </Col>
      </Row>
    </div>
  );
};

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view
};
