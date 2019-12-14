import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, PageComponent, PageInit, Update, updateComponentChild } from 'front-end/lib/framework';
import * as GovProfileForm from 'front-end/lib/pages/user/components/profile';
import makeSidebar from 'front-end/lib/views/sidebar/menu';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { getAllUsers } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';

export interface State {
  govProfile: Immutable<GovProfileForm.State>;
}

type InnerMsg
  = ADT<'govProfile', GovProfileForm.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

type ActiveTab
  = 'profile'
  | 'legal'
  | 'organizations';

export interface RouteParams {
  userId: string;
  activeTab?: ActiveTab;
}

const init: PageInit<RouteParams, SharedState, State, Msg> = async () => ({
  govProfile: immutable(await GovProfileForm.init({
    existingUser: getAllUsers()[0]
  }))
});

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'govProfile':
      return updateComponentChild({
        state,
        childStatePath: ['govProfile'],
        childUpdate: GovProfileForm.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('govProfile', value)
      });
    default:
      return [state];
  }
};

const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <div>
      <Row className='mb-3 pb-3'>
        <Col xs='12'>
          <h1>User Profile</h1>
        </Col>
      </Row>
      <Row>
        <Col xs='12'>
          <GovProfileForm.view
            state={state.govProfile}
            dispatch={mapComponentDispatch(dispatch, value => adt('govProfile' as const, value))} />
        </Col>
      </Row>
    </div>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  sidebar: {
    size: 'medium',
    color: 'light',
    view: makeSidebar<State, Msg>(
    [
      {
        target: '',
        icon: 'paperclip',
        text: 'Profile',
        active: true,
        route: { tag: 'userProfile', value: {userId: '1'}} as Route
      },
      {
        target: '',
        icon: 'paperclip',
        text: 'Notifications',
        active: false,
        route: { tag: 'landing' } as Route
      },
      {
        target: '',
        icon: 'paperclip',
        text: 'Accepted Policies, Terms & Agreements',
        active: false,
        route: { tag: 'landing' } as Route
      }
    ])
  },
  getMetadata() {
    return makePageMetadata('User Edit');
  }
};
