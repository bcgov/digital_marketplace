import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, PageComponent, PageInit, Update } from 'front-end/lib/framework';
import Link, { routeDest } from 'front-end/lib/views/link';
import React, { ReactElement } from 'react';
import { Col, Row } from 'reactstrap';
import { adt, ADT } from 'shared/lib/types';

export type NoticeId
  = ADT<'deactivatedOwnAccount'>
  | ADT<'authFailure'>;

export function parseNoticeId(tag: any, value: any): NoticeId | null {
  switch (tag) {
    case 'deactivatedOwnAccount':
      return adt('deactivatedOwnAccount');
    case 'authFailure':
      return adt('authFailure');
    default:
      return null;
  }
}

function noticeIdToState(noticeId: NoticeId): State {
  switch (noticeId.tag) {

    case 'deactivatedOwnAccount':
      return {
        title: 'Account Deactivation Successful',
        body: 'You have successfully deactivated your account.',
        button: {
          text: 'Back to Home',
          route: {
            tag: 'landing',
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

export type RouteParams = NoticeId;

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
  return noticeIdToState(routeParams);
};

const update: Update<State, Msg> = ({ state, msg }) => {
  return [state];
};

const ConditionalButton: ComponentView<State, Msg> = ({ state, dispatch }) => {
  if (state.button) {
    return (
      <Row>
        <Col xs='12'>
          <Link dest={routeDest(state.button.route)} button color='primary'>{state.button.text}</Link>
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
