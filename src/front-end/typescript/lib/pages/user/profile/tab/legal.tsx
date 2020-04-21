import { Route } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, Init, Update } from 'front-end/lib/framework';
import * as Tab from 'front-end/lib/pages/user/profile/tab';
import Link, { routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { formatDate, formatTime } from 'shared/lib';
import { adt, ADT } from 'shared/lib/types';

export interface State extends Tab.Params {
  empty: true;
}

export type InnerMsg
  = ADT<'noop'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

const init: Init<Tab.Params, State> = async ({ viewerUser, profileUser }) => {
  return {
    profileUser,
    viewerUser,
    empty: true
  };
};

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    default:
      return [state];
  }
};

const view: ComponentView<State, Msg> = ({ state }) => {
  const acceptedTerms = state.profileUser.acceptedTerms;
  return (
    <div>
      <Row>
        <Col xs='12'>
          <h2>Accepted Policies, Terms & Agreements</h2>
          <p className='mb-0'>In this section, you will find all of the policies, terms and agreements that you have accepted.</p>
        </Col>
      </Row>
      <Row>
        <Col xs='12'>
          <div className='mt-5 pt-5 border-top'>
            <p className='mb-5'>
              {acceptedTerms
                ? `You agreed to the following on ${formatDate(acceptedTerms)} at ${formatTime(acceptedTerms, true)}.`
                : 'You have not yet agreed to the following.'}
            </p>
            <h3>Privacy Policy</h3>
            <p>Your personal information is being collected by the Ministry of Citizens’ Services under s.26(c) of the Freedom of Information and Protection of Privacy Act (FOIPPA). The collection, use and disclosure of your personal information is for the purpose of notifying, applying and awarding opportunities on the BCDevExchange. If you have any questions, please contact: Peter Watkins, Executive Director, BC Developers’ Exchange and DevOps, Ministry of Citizens’ Services, 250-514-2739.</p>
          </div>
        </Col>
        <Col xs='12'>
          <div className='mt-4'>
            <h3>Terms & Conditions</h3>
            <Link newTab dest={routeDest(adt('content', 'terms-and-conditions'))}>Review the Terms & Conditions</Link>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view
};
