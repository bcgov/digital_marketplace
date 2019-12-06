import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import Link from 'front-end/lib/views/link';
import Icon from 'front-end/lib/views/icon';
import makeSignInVerticalBar from 'front-end/lib/views/vertical-bar/sign-in';
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


export interface HorizontalCardParams {
  title: string;
  description: string;
  buttonText: string;
}

function HorizontalCard(params: HorizontalCardParams) {
  return (
      <Row>
        <Col xs='11' className='mx-auto sign-in-card'>
          <h2>
            <Icon name='paperclip' color='primary'/>
            <span className="pl-1">{params.title}</span>
          </h2>
          <p>{params.description}</p>
          <Link button className='btn-primary'>{params.buttonText}</Link>
        </Col>
      </Row>
  );
}

const view: ComponentView<State, Msg> = ({ state }) => {
  return (
    <div className='py-5'>

      <Row className='pb-4'>
        <Col xs='11' className='mx-auto'>
          <h2>Choose Account Type</h2>
          <p>Choose the account type that describes you best. Access to certain features of the app will be based on the account type that you select.</p>
        </Col>
      </Row>
      <HorizontalCard title='Vendor' description='Vendors will be required to have a GitHub account to sign up for the Digital Marketplace.  Don’t have an account? Creating one only takes a minute.' buttonText='Sign Up Using GitHub' />
      <HorizontalCard title='Public Sector Employee' description='Public sector employees will be required to use their IDIR to sign up for the Digital Marketplace. ' buttonText='Sign Up Using IDIR' />
    </div>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  viewVerticalBar: makeSignInVerticalBar<State, Msg>({
    backMsg: { tag: 'noop', value: undefined },
    getTitle: () => 'Create Your Digital Marketplace Account.',
    getDescription: () => 'Join a community of developers, entrepreneurs and public service innovators who are making public services better.',
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
