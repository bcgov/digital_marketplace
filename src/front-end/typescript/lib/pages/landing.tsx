import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, emptyPageAlerts, GlobalComponentMsg, PageComponent, PageInit, Update } from 'front-end/lib/framework';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { ADT } from 'shared/lib/types';

export interface State {
  toasts: Array<[string, string]>;
}

type InnerMsg
  = ADT<'noop'>
  | ADT<'hideToast', number>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = async () => ({
  toasts: [
    [
      'First Toast',
      'This is an example toast. This is an example toast. This is an example toast. This is an example toast.'
    ],
    [
      'Second Toast',
      'This is an example toast. This is an example toast. This is an example toast. This is an example toast.'
    ],
    [
      'Third Toast',
      'This is an example toast. This is an example toast. This is an example toast. This is an example toast.'
    ],
    [
      'Fourth Toast',
      'This is an example toast. This is an example toast. This is an example toast. This is an example toast.'
    ]
  ]
});

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'hideToast':
      return [
        state.update('toasts', ts => ts.filter((t, i) => i !== msg.value))
      ];
    default:
      return [state];
  }
};

const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <Row>
      <Col xs='12'>
        Landing page coming soon.
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
  getToasts(state) {
    return state.toasts.map((t, i) => ({
      title: t[0],
      body: t[1],
      dismissMsg: { tag: 'hideToast', value: i }
    }));
  },
  getBreadcrumbs() {
    return [
      { text: 'First' },
      { text: 'Second' }
    ];
  }
};
