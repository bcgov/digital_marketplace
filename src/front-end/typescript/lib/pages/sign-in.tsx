import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import Link from 'front-end/lib/views/link';
import makeSignInVerticalBar from 'front-end/lib/views/vertical-bar/sign-in';
import { ComponentView, GlobalComponentMsg, PageComponent, PageInit, Update } from 'front-end/lib/framework';
import { deleteSession } from 'front-end/lib/http/api';
import { get } from 'lodash';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { ADT } from 'shared/lib/types';
import { HorizontalCard } from 'front-end/lib/views/horizontal-card';

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
    <div className='py-5'>

      <Row className='pb-4'>
        <Col xs='11' className='mx-auto'>
          <h2>Sign In</h2>
          <p>Select one of the options available below to sign in to your Digital Marketplace account.</p>
        </Col>
      </Row>
      <HorizontalCard title='Vendor' description='Use your GitHub account to sign in to the Digital Marketplace.' buttonText='Sign Up Using GitHub' />
      <HorizontalCard title='Public Sector Employee' description='Use your IDIR to sign in to the Digital Marketplace.' buttonText='Sign Up Using IDIR' />
    </div>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  viewVerticalBar: makeSignInVerticalBar<State, Msg>({
    backMsg: { tag: 'noop', value: undefined },
    getTitle: () => 'Welcome Back to the Digital Marketplace',
    getDescription: () => 'Pleas sign in to access your Digital Marketplace account.',
    getFooter: () => (
      <span>
        Already have an account?&nbsp;
        <Link route={{ tag: 'landing', value: null }}>Sign in</Link>.
      </span>
    )
  }),
  getMetadata() {
    return makePageMetadata('Signed Out');
  }
};
