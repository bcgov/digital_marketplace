import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, PageComponent, PageInit, Update } from 'front-end/lib/framework';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { ADT, Id } from 'shared/lib/types';

export interface State {
  empty: true;
}

export type Msg = GlobalComponentMsg<ADT<'noop'>, Route>;

export interface RouteParams {
  id: Id;
}

const init: PageInit<RouteParams, SharedState, State, Msg> = async () => {
  return { empty: true };
};

const update: Update<State, Msg> = ({ state, msg }) => {
  return [state];
};

const view: ComponentView<State, Msg> = ({ state }) => {
  return (
    <Row>
      <Col xs='12'>
        Opportunities/View
      </Col>
    </Row>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  getMetadata() {
    // TODO(Jesse): Dump name in this string?
    return makePageMetadata('Opportunity');
  }
};
