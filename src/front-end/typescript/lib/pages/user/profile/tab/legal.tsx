import { Route } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, Init, Update, View, ViewElementChildren } from 'front-end/lib/framework';
import * as Tab from 'front-end/lib/pages/user/profile/tab';
import Link, { emailDest, iconLinkSymbol, rightPlacement, routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { COPY } from 'shared/config';
import { formatDate, formatTime } from 'shared/lib';
import { adt, ADT } from 'shared/lib/types';

// Only vendors can view this tab.

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

const TermsSubtext: View<{ children: ViewElementChildren; }> = ({ children }) => {
  return (
    <div className='mt-2 text-secondary font-size-small'>
      {children}
    </div>
  );
};

const view: ComponentView<State, Msg> = ({ state }) => {
  const lastAcceptedTerms = state.profileUser.lastAcceptedTermsAt;
  const acceptedTerms = state.profileUser.acceptedTermsAt;
  const hasAcceptedLatest = !!acceptedTerms;
  return (
    <div>
      <Row>
        <Col xs='12'>
          <h2>Accepted Policies, Terms & Agreements</h2>
          <p className='mb-0'>In this section, you will find all of the policies, terms and agreements relevant to vendors of the Digital Marketplace.</p>
        </Col>
      </Row>
      <Row>
        <Col xs='12'>
          <div className='mt-5 pt-5 border-top'>
            <h3>Privacy Policy</h3>
            <div>Your personal information is being collected by the Ministry of Citizens’ Services under s.26(c) of the Freedom of Information and Protection of Privacy Act (FOIPPA). The collection, use and disclosure of your personal information is for the purpose of notifying, applying and awarding opportunities on the Digital Marketplace. If you have any questions, please contact: Zachary Woodward, Senior Director, Procurement, Ministry of Citizens’ Services, <Link dest={emailDest(['procurementadvisory@gov.bc.ca'])}>procurementadvisory@gov.bc.ca</Link>.</div>
            {lastAcceptedTerms
              ? (<TermsSubtext>You agreed to the Digital Marketplace <i>Privacy Policy</i> on {formatDate(lastAcceptedTerms)} at {formatTime(lastAcceptedTerms, true)}.</TermsSubtext>)
              : null}
          </div>
        </Col>
        <Col xs='12'>
          <div className='mt-4'>
            <h3>Terms & Conditions</h3>
            <div className='mt-3'>
              <Link newTab dest={routeDest(adt('content', 'terms-and-conditions'))} symbol_={hasAcceptedLatest ? undefined : rightPlacement(iconLinkSymbol('warning'))} symbolClassName='text-warning'>{COPY.appTermsTitle}</Link>
              {acceptedTerms
                ? (<TermsSubtext>You agreed to the <i>{COPY.appTermsTitle}</i> on {formatDate(acceptedTerms)} at {formatTime(acceptedTerms, true)}.</TermsSubtext>)
                : (<TermsSubtext>The <i>{COPY.appTermsTitle}</i> have been updated. Please review the latest version and agree to the updated terms using <Link>this link</Link>.</TermsSubtext>)}
            </div>
            <div className='mt-3'>
              <Link newTab dest={routeDest(adt('content', 'code-with-us-terms-and-conditions'))}>Code With Us Terms & Conditions</Link>
            </div>
            <div className='mt-3'>
              <Link newTab dest={routeDest(adt('content', 'sprint-with-us-terms-and-conditions'))}>Sprint With Us Terms & Conditions</Link>
            </div>
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
