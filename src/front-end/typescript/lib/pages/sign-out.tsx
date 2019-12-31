import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, PageComponent, PageInit, Update } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { CURRENT_SESSION_ID } from 'shared/lib/resources/session';
import { ADT } from 'shared/lib/types';

export interface State {
  message: string;
}

export type Msg = GlobalComponentMsg<ADT<'noop'>, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = async () => {
  const result = await api.sessions.delete(CURRENT_SESSION_ID);
  if (api.isValid(result)) {
    return { message: 'You have successfully signed out. Thank you for using the Digital Marketplace.' };
  } else {
    return { message: 'Signing out of the application failed.' };
  }
};

const update: Update<State, Msg> = ({ state, msg }) => {
  return [state];
};

const view: ComponentView<State, Msg> = ({ state }) => {
  return (
    <Row>
      <Col xs='12'>
        {state.message}
      </Col>
    </Row>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  getMetadata() {
    return makePageMetadata('Signed Out');
  }
};
