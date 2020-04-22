import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, PageComponent, PageInit, Update } from 'front-end/lib/framework';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { ADT } from 'shared/lib/types';

export interface State {
  empty: true;
}

type InnerMsg
  = ADT<'noop'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = async () => ({
  empty: true
});

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    default:
      return [state];
  }
};

const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <Row>
      <Col xs='12'>
        Empty Page
      </Col>
    </Row>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  getMetadata() {
    return makePageMetadata('Empty Page');
  }
};
