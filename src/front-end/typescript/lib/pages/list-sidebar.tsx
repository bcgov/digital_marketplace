import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, PageComponent, PageInit, Update } from 'front-end/lib/framework';
import Link from 'front-end/lib/views/link';
import Icon from 'front-end/lib/views/icon';
import makeVerticalBar from 'front-end/lib/views/vertical-bar/menu';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { ADT } from 'shared/lib/types';

export interface State {
  empty: true;
}

export type Msg = GlobalComponentMsg<ADT<'noop'>, Route>;

export type RouteParams = null;

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
          <h1>Hello</h1>
          <p> World </p>
        </Col>
      </Row>
    </div>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  viewVerticalBar: makeVerticalBar<State, Msg>({
    links: [
      <Link button color='primary'><Icon name='search' className='pr-1'></Icon>Profile</Link>,
      <Link button><Icon name='search' className='pr-1'></Icon>Notifications</Link>,
      <Link button><Icon name='search' className='pr-1'></Icon>Accepted Policies, Terms & Agreements</Link>
    ]
  }),
  getMetadata() {
    return makePageMetadata('Hello, World');
  },
  getBreadcrumbs() {
    return [
      { text: 'One' },
      { text: 'Two' },
      { text: 'Three' }
    ];
  }
};
