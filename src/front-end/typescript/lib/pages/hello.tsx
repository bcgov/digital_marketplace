import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, emptyPageAlerts, GlobalComponentMsg, PageComponent, PageInit, Update } from 'front-end/lib/framework';
import Link from 'front-end/lib/views/link';
import makeSignInVerticalBar from 'front-end/lib/views/vertical-bar/sign-in';
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
          Hello, world.
        </Col>
      </Row>
    </div>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  viewVerticalBar: makeSignInVerticalBar<State, Msg>({
    backMsg: { tag: 'noop', value: undefined },
    getTitle: () => 'Vertical Bar',
    getDescription: () => 'Foo',
    getFooter: () => (
      <span>
        Already have an account?&nbsp;
        <Link route={{ tag: 'hello', value: null }}>Sign in</Link>.
      </span>
    )
  }),
  getAlerts(state) {
    return {
      ...emptyPageAlerts(),
      info: ['Test alert']
    };
  },
  getMetadata() {
    return makePageMetadata('Hello, World');
  }
};
