import { makePageMetadata, sidebarValid, viewValid } from 'front-end/lib';
import { isSignedOut } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, PageComponent, PageInit, replaceRoute, replaceUrl, Update } from 'front-end/lib/framework';
import Link, { routeDest } from 'front-end/lib/views/link';
import makeInstructionalSidebar from 'front-end/lib/views/sidebar/instructional';
import { SignInCard } from 'front-end/lib/views/sign-in-card';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { GOV_IDP_NAME, VENDOR_IDP_NAME } from 'shared/config';
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
          <h2>Choose Account Type</h2>
          <p>Choose the account type that describes you best. Access to certain features of the app will be based on the account type that you select.</p>
        </Col>
      </Row>

      <SignInCard title='Vendor'
        description={`Vendors will be required to have a ${VENDOR_IDP_NAME} account to sign up for the Digital Marketplace. Don’t have an account? Creating one only takes a minute.`}
        buttonText={`Sign Up Using ${VENDOR_IDP_NAME}`}
        redirectOnSuccess={state.redirectOnSuccess}
        userType={UserType.Vendor}
      />

      <SignInCard title='Public Sector Employee'
        description={`Public sector employees will be required to use their ${GOV_IDP_NAME} to sign up for the Digital Marketplace.`}
        buttonText={`Sign Up Using ${GOV_IDP_NAME}`}
        redirectOnSuccess={state.redirectOnSuccess}
        userType={UserType.Government}
      />

    </div>
  );
});

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  sidebar: sidebarValid({
    size: 'large',
    color: 'c-sidebar-instructional-bg',
    view: makeInstructionalSidebar<ValidState, Msg>({
      getTitle: () => 'Create Your Digital Marketplace Account.',
      getDescription: () => 'Join a community of developers, entrepreneurs and public service innovators who are making public services better.',
      getFooter: ({ state }) => (
        <span>
          Already have an account?&nbsp;
          <Link dest={routeDest(adt('signIn', { redirectOnSuccess: state.redirectOnSuccess }))}>Sign in</Link>.
        </span>
      )
    })
  }),
  getMetadata() {
    return makePageMetadata('Sign Up - Step One');
  }
};
