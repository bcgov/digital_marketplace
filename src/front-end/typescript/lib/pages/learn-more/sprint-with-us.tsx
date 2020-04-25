import { makePageMetadata, prefixPath } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, PageComponent, PageInit, Update, View } from 'front-end/lib/framework';
import Accordion from 'front-end/lib/views/accordion';
import HowItWorksItem from 'front-end/lib/views/hiw-item';
import Link, { routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Container, Row } from 'reactstrap';
import { ADT, adt } from 'shared/lib/types';

export interface State {
  isWhatToExpectAccordionOpen: boolean;
  isHowToApplyAccordionOpen: boolean;
}

type InnerMsg
  = ADT<'noop'>
  | ADT<'toggleWhatToExpectAccordion'>
  | ADT<'toggleHowToApplyAccordion'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = async () => ({
  isWhatToExpectAccordionOpen: true,
  isHowToApplyAccordionOpen: true
});

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'toggleWhatToExpectAccordion':
      return [state.update('isWhatToExpectAccordionOpen', v => !v)];
    case 'toggleHowToApplyAccordion':
      return [state.update('isHowToApplyAccordionOpen', v => !v)];
    default:
      return [state];
  }
};

const TitleView: View<{}> = () => {
  return (
    <div className='bg-blue-light-alt-2 pb-5 pb-md-0'>
      <Container>
        <Row>
          <Col xs='12' md='8'>
            <h1>Sprint With Us</h1>
            <em>Sprint With Us</em> is a procurement mechanism that allows the Government of B.C. to procure Agile software development teams.
          </Col>
          <Col md='4'><img className='d-none d-md-block mx-auto mb-n8' src={prefixPath('/images/illustrations/swu-learnmore.svg')} /></Col>
        </Row>
      </Container>
    </div>
  );
};

const WhatToExpectView: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <div className='pb-5 bg-white'>
      <Container>
        <Row>
          <Col xs='12' md='8'>
            <Accordion
              className='mt-6'
              toggle={() => dispatch(adt('toggleWhatToExpectAccordion'))}
              color='bcgov-blue'
              title='What To Expect'
              titleClassName='h3 mb-0 ml-2'
              chevronWidth={2}
              chevronHeight={2}
              open={state.isWhatToExpectAccordionOpen}>
                <div className='mb-3'>If your organization is awarded a Sprint With Us opportunity, here is what you can expect when you work with us:</div>
                <Row>
                  <Col xs='12' md='6'>
                    <InfoBlockView
                      title='Government Product Managers'
                      description='You will work closely with a trained government product manager who has the expertise and the responsibility to run the service.'
                    />
                    <InfoBlockView
                      title='Interdisciplinary Teams'
                      description='Your team will possess all the skills necessary for continuous delivery, such as DevOps engineering, front-end and back-end development, and user experience research and design.'
                    />
                    <InfoBlockView
                      title='Open Source'
                      description="Your team will own the code that's produced, but it will be published in GitHub under an open source license."
                    />
                  </Col>
                  <Col xs='12' md='6'>
                    <InfoBlockView
                      title='Agile'
                      description='You will be adaptable to change and follow the Agile Scrum process, building and validating features iteratively with users.'
                    />
                    <InfoBlockView
                      title='Agile Phases'
                      description='Don’t expect lengthy requirements. This is Agile. You will start with Inception to understand the business problem, then build a Proof of Concept to demonstrate feasability of the solution. Finally, you will build out the rest of the procut in Implementation.'
                    />
                    <InfoBlockView
                      title='Pricing & Incentives'
                      description="These are not time & materials contracts! For each phase, you'll charge a fixed price for your interdisciplinary team to meet the deliverables for the time period. There's incentives to complete a phase early!"
                    />
                  </Col>
                </Row>
            </Accordion>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

interface InfoBlockProps {
  title: string;
  description: string;
}

const InfoBlockView: View<InfoBlockProps> = ({ title, description }) => {
  return (
    <div className='my-4'>
      <div className='d-flex flex-column align-items-center border bg-white rounded-lg py-5 px-4 text-center h-100'>
        <h4 className='my-3'>{title}</h4>
        <div className='mb-2'>{description}</div>
      </div>
    </div>
  );
};

export const HowToApplyView: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <div className='pb-5 bg-white'>
      <Container>
        <Row>
          <Col xs='12' md='8'>
            <Accordion
              className='mt-6'
              toggle={() => dispatch(adt('toggleHowToApplyAccordion'))}
              color='bcgov-blue'
              title='How To Apply'
              titleClassName='h3 mb-0 ml-2'
              chevronWidth={2}
              chevronHeight={2}
              open={state.isHowToApplyAccordionOpen}>
                <div className='mb-3'>To apply for <em>Sprint With Us</em> opportunities, complete the following steps:</div>
                <HowItWorksItem
                  iconText='1'
                  foreColor='white'
                  bgColor='purple'
                  header='Sign In to Your Vendor Account'
                  subText={(
                    <div><Link dest={routeDest(adt('signIn', {}))}>Sign in</Link> to your Digital Marketplace Vendor account using GitHub. If you do not yet have an account, you must <Link dest={routeDest(adt('signUpStepOne', null))}>sign up</Link>, first.</div>)}
                  className='mb-4'
                />
                <HowItWorksItem
                  iconText='2'
                  foreColor='white'
                  bgColor='purple'
                  header='Register Your Organization'
                  subText={(
                    <div>
                      <p>Go to the Organizations page and click on the <strong>+ Create Organization</strong> button. Complete the form by providing all required information and submit.</p>
                      <p>Similarly, you may register your organization via your user profile.</p>
                    </div>
                  )}
                  className='mb-4'
                />
                <HowItWorksItem
                  iconText='3'
                  foreColor='white'
                  bgColor='purple'
                  header='Become a Qualified Supplier'
                  subText={(
                    <div>
                      <p>You must be considered a Qualified Supplier to apply for <em>Sprint With Us</em> opportunities.</p>
                      <p>To complete the qualification process, access your registered organization via your user profile and navigate to the <em>SWU Qualification</em> tab.  Complete the requirements as provided to become a Qualified Supplier.</p>
                    </div>
                  )}
                  className='mb-4'
                />
            </Accordion>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

const Spacer: View<{}> = () => {
  return (<div className='bg-white d-flex flex-grow-1' />);
};

const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <div className='d-flex flex-column flex-grow-1'>
      <TitleView />
      <WhatToExpectView state={state} dispatch={dispatch} />
      <HowToApplyView state={state} dispatch={dispatch} />
      <Spacer />
    </div>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  fullWidth: true,
  backgroundColor: 'blue-light-alt-2',
  init,
  update,
  view,
  getMetadata() {
    return makePageMetadata('Code With Us - Learn More');
  }
};
