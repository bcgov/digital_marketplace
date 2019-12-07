import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, PageComponent, PageInit, Update } from 'front-end/lib/framework';
import makeSidebar from 'front-end/lib/views/sidebar/menu';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { ADT } from 'shared/lib/types';

export interface State {
  empty: true;
}

export type Msg = GlobalComponentMsg<ADT<'noop'>, Route>;

export interface RouteParams {
  userId: string;
}

const init: PageInit<RouteParams, SharedState, State, Msg> = async () => ({
  empty: true,
  hello: ''
});

const update: Update<State, Msg> = ({ state, msg }) => {
  return [state];
};

const view: ComponentView<State, Msg> = ({ state }) => {
  return (
    <div>
      <Row className='mb-3 pb-3'>
        <Col xs='12'>
          <h1>User Profile</h1>
        </Col>
      </Row>
    </div>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  viewSidebar: makeSidebar<State, Msg>(
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
  ]),
  getMetadata() {
    return makePageMetadata('User Edit');
  }
};
