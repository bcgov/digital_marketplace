import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, PageComponent, PageInit, Update } from 'front-end/lib/framework';
import { deleteSession } from 'front-end/lib/http/api';
import { get } from 'lodash';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { ADT } from 'shared/lib/types';

export interface State {
  message: string;
}

export type Msg = GlobalComponentMsg<ADT<'noop'>, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = async () => {
  const session = await deleteSession();
  if (!get(session, 'user')) {
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
    <div>
      <Row>
        <Col xs='12'>
          Step 1
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
    return makePageMetadata('Sign Up - Step Two');
  }
};
