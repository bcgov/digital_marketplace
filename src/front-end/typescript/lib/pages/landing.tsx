import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, emptyPageAlerts, GlobalComponentMsg, PageComponent, PageInit, toast, Update } from 'front-end/lib/framework';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { adt, ADT } from 'shared/lib/types';

export interface State {
  toast: [string, string];
}

type InnerMsg
  = ADT<'noop'>
  | ADT<'showToast'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = async () => ({
  toast: [
    'Example Toast',
    'This is an example toast. This is an example toast. This is an example toast. This is an example toast.'
  ]
});

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'showToast':
      return [
        state,
        async (state, dispatch) => {
          dispatch(toast({
            title: state.toast[0],
            body: state.toast[1]
          }));
          return null;
        }
      ];
    default:
      return [state];
  }
};

const view: ComponentView<State, Msg> = ({state, dispatch}) => {
  return (
    <Row>
      <Col xs='12'>
        Landing page coming soon.
      </Col>
      <Col xs='12' className='mt-5'>
        <button onClick={() => dispatch(adt('showToast'))}>Show Toast</button>
      </Col>
    </Row>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  getMetadata() {
    return makePageMetadata('Welcome');
  },
  getAlerts() {
    return {
      ...emptyPageAlerts(),
      info: [
        { text: 'first test alert' },
        { text: 'second test alert' }
      ],
      errors: [
        { text: 'first test alert' },
        { text: 'second test alert' }
      ]
    };
  },
  getBreadcrumbs() {
    return [
      { text: 'First' },
      { text: 'Second' }
    ];
  }
};
