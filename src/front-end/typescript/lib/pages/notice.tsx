import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, PageComponent, PageInit, Update } from 'front-end/lib/framework';
import Link from 'front-end/lib/views/link';
import React, { ReactElement } from 'react';
import { Col, Row } from 'reactstrap';
import { ADT } from 'shared/lib/types';

export type NoticeId
  = ADT<'notFound'>
  | ADT<'authFailure'>;

function noticeIdToState(noticeId: NoticeId): State {
  switch (noticeId.tag) {

    case 'notFound':
      return {
        title: 'Page Not Found',
        body: 'The page you are looking for does not exist.',
        button: {
          text: 'Back to Home',
          route: {
            tag: 'hello',
            value: null
          }
        }
      };

    case 'authFailure':
      return {
        title: 'Sign-In Failed',
        body: 'Please try again using the "Sign-In" button.'
      };
  }
}

export interface RouteParams {
  noticeId: NoticeId;
}

export interface State {
  title: string;
  body: string | ReactElement;
  button?: {
    text: string;
    route: Route;
  };
}

export type Msg = GlobalComponentMsg<null, Route>;

const init: PageInit<RouteParams, SharedState, State, Msg> = async ({ routeParams }) => {
  return noticeIdToState(routeParams.noticeId);
};

const update: Update<State, Msg> = ({ state, msg }) => {
  return [state];
};

const ConditionalButton: ComponentView<State, Msg> = ({ state, dispatch }) => {
  if (state.button) {
    return (
      <Row>
        <Col xs='12'>
          <Link route={state.button.route} button color='primary'>{state.button.text}</Link>
        </Col>
      </Row>
    );
  } else {
    return null;
  }
};

const view: ComponentView<State, Msg> = props => {
  const { state } = props;
  return (
    <div>
      <Row className='mb-3'>
        <Col xs='12'>
          <h1>{state.title}</h1>
        </Col>
      </Row>
      <Row className='mb-3 pb-3'>
        <Col xs='12'>
          {typeof state.body === 'string'
            ? (<p>{state.body}</p>)
            : state.body}
        </Col>
      </Row>
      <ConditionalButton {...props} />
    </div>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  getMetadata({ title }) {
    return makePageMetadata(title);
  }
};
