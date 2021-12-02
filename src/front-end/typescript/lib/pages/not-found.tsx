import { makePageMetadata } from 'front-end/typescript/lib';
import { Route, SharedState } from 'front-end/typescript/lib/app/types';
import { ComponentView, GlobalComponentMsg, PageComponent, PageInit, Update } from 'front-end/typescript/lib/framework';
import Link, { routeDest } from 'front-end/typescript/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { adt, ADT } from 'shared/lib/types';

export interface RouteParams {
  path?: string;
}

export type State = RouteParams;

export type Msg = GlobalComponentMsg<ADT<'noop'>, Route>;

const init: PageInit<RouteParams, SharedState, State, Msg> = async ({ routeParams }) => {
  return routeParams;
};

const update: Update<State, Msg> = ({ state, msg }) => {
  return [state];
};

const view: ComponentView<State, Msg> = () => {
  return (
    <div>
      <Row className='mb-3'>
        <Col xs='12'>
          <h1>Not Found</h1>
        </Col>
      </Row>
      <Row className='mb-3 pb-3'>
        <Col xs='12'>
          <p>The page you are looking for doesn't exist.</p>
        </Col>
      </Row>
      <Row>
        <Col xs='12'>
          <Link dest={routeDest(adt('landing', null))} button color='primary'>Go Home</Link>
        </Col>
      </Row>
    </div>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  getMetadata() {
    return makePageMetadata('Not Found');
  }
};
