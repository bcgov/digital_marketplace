import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, emptyPageAlerts, GlobalComponentMsg, PageAlert, PageComponent, PageInit, Update } from 'front-end/lib/framework';
import Link from 'front-end/lib/views/link';
import makeSignInVerticalBar from 'front-end/lib/views/vertical-bar/sign-in';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { ADT } from 'shared/lib/types';

export interface State {
  infoAlerts: Array<PageAlert<Msg>>;
}

type InnerMsg
  = ADT<'noop'>
  | ADT<'dismissInfoAlert', number>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = async () => ({
  infoAlerts: [
    { text: 'LOREM ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.' },
    { text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.', dismissMsg: { tag: 'dismissInfoAlert', value: 1 } }
  ],
  landing: ''
});

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'dismissInfoAlert':
      const foo = state.update('infoAlerts', alerts => alerts.filter((a, i) => {
        return i !== msg.value;
      }));
      //tslint:disable
      console.log(foo);
      return [
        state.update('infoAlerts', alerts => alerts.filter((a, i) => {
          return i !== msg.value;
        }))
      ];
    default:
      return [state];
  }
};

const view: ComponentView<State, Msg> = ({ state }) => {
  return (
    <div>
      <Row className='mb-3 pb-3'>
        <Col xs='12'>
          Landing, world.
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
        <Link route={{ tag: 'landing', value: null }}>Sign in</Link>.
      </span>
    )
  }),
  getAlerts(state) {
    return {
      ...emptyPageAlerts(),
      info: state.infoAlerts
    };
  },
  getMetadata() {
    return makePageMetadata('Hello, World');
  }
};
