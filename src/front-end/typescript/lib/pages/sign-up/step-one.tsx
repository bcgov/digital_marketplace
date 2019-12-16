import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, PageComponent, PageInit, Update } from 'front-end/lib/framework';
import { SignInCard } from 'front-end/lib/views/horizontal-card';
import Link, { routeDest } from 'front-end/lib/views/link';
import makeInstructionalSidebar from 'front-end/lib/views/sidebar/instructional';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { ADT, adt } from 'shared/lib/types';

export interface State {
  empty: true;
}

export type Msg = GlobalComponentMsg<ADT<'noop'>, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = async () => ({ empty: true });

const update: Update<State, Msg> = ({ state, msg }) => {
  return [state];
};

const view: ComponentView<State, Msg> = ({ state }) => {
  return (
    <div>
      <Row className='pb-4'>
        <Col xs='11' className='mx-auto'>
          <h2>Choose Account Type</h2>
          <p>Choose the account type that describes you best. Access to certain features of the app will be based on the account type that you select.</p>
        </Col>
      </Row>

      <SignInCard title='Vendor'
        description='Vendors will be required to have a GitHub account to sign up for the Digital Marketplace. Don’t have an account? Creating one only takes a minute.'
        buttonText='Sign Up Using GitHub'
        signInTarget='github'
      />

      <SignInCard title='Public Sector Employee'
        description='Public sector employees will be required to use their IDIR to sign up for the Digital Marketplace.'
        buttonText='Sign Up Using IDIR'
        signInTarget='idir'
      />

    </div>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  sidebar: {
    size: 'large',
    color: 'light-blue',
    view: makeInstructionalSidebar<State, Msg>({
      showBackLink: true,
      getTitle: () => 'Create Your Digital Marketplace Account.',
      getDescription: () => 'Join a community of developers, entrepreneurs and public service innovators who are making public services better.',
      getFooter: () => (
        <span>
          Already have an account?&nbsp;
          <Link dest={routeDest(adt('signIn', null))}>Sign in</Link>.
        </span>
      )
    })
  },
  getMetadata() {
    return makePageMetadata('Sign Up - Step One');
  }
};
