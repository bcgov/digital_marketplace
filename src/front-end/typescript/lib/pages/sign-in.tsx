import { makePageMetadata, sidebarValid, viewValid } from 'front-end/lib';
import { isSignedOut } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, PageComponent, PageInit, replaceRoute, replaceUrl, Update } from 'front-end/lib/framework';
import Link, { routeDest } from 'front-end/lib/views/link';
import makeInstructionalSidebar from 'front-end/lib/views/sidebar/instructional';
import { SignInCard } from 'front-end/lib/views/sign-in-card';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { UserType } from 'shared/lib/resources/user';
import { ADT, adt } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

interface ValidState {
  redirectOnSuccess?: string;
}

export type State = Validation<Immutable<ValidState>, null>;

export type Msg = GlobalComponentMsg<ADT<'noop'>, Route>;

export type RouteParams = ValidState;

const init: PageInit<RouteParams, SharedState, State, Msg> = isSignedOut<RouteParams, State, Msg>({
  async success({ routeParams }) {
    return valid(immutable(routeParams));
  },
  async fail({ dispatch, routeParams }) {
    const msg: Msg = routeParams.redirectOnSuccess
      ? replaceUrl(routeParams.redirectOnSuccess)
      : replaceRoute(adt('dashboard' as const, null));
    dispatch(msg);
    return invalid(null);
  }
});

const update: Update<State, Msg> = ({ state, msg }) => {
  return [state];
};

const view: ComponentView<State, Msg> = viewValid(({ state }) => {
  return (
    <div>
      <Row className='pb-4'>
        <Col xs='12' className='mx-auto'>
          <h2>Sign In</h2>
          <p>Select one of the options available below to sign in to your Digital Marketplace account.</p>
        </Col>
      </Row>
      <SignInCard
        userType={UserType.Vendor}
        title='Vendor'
        description='Use your GitHub account to sign in to the Digital Marketplace.'
        redirectOnSuccess={state.redirectOnSuccess}
        buttonText='Sign In Using GitHub' />
      <SignInCard
        userType={UserType.Government}
        redirectOnSuccess={state.redirectOnSuccess}
        title='Public Sector Employee'
        description='Use your IDIR to sign in to the Digital Marketplace.'
        buttonText='Sign In Using IDIR' />
    </div>
  );
});

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  sidebar: sidebarValid({
    size: 'large',
    color: 'blue-light',
    view: makeInstructionalSidebar<ValidState, Msg>({
      getTitle: () => 'Welcome Back to the Digital Marketplace',
      getDescription: () => 'Please sign in to access your Digital Marketplace account.',
      getFooter: ({ state }) => (
        <span>
          Don't have an account?&nbsp;
          <Link dest={routeDest(adt('signUpStepOne', { redirectOnSuccess: state.redirectOnSuccess }))}>Sign up</Link>.
        </span>
      )
    })
  }),
  getMetadata() {
    return makePageMetadata('Sign In');
  }
};
