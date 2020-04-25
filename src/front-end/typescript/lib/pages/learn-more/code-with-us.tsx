import { makePageMetadata, prefixPath } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, PageComponent, PageInit, Update, View } from 'front-end/lib/framework';
import Accordion from 'front-end/lib/views/accordion';
import HowItWorksItem from 'front-end/lib/views/hiw-item';
import Link, { iconLinkSymbol, leftPlacement, routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Container, Row } from 'reactstrap';
import { ADT, adt } from 'shared/lib/types';

export interface State {
  isVendorAccordionOpen: boolean;
  isPublicSectorAccordionOpen: boolean;
}

type InnerMsg
  = ADT<'noop'>
  | ADT<'toggleVendorAccordion'>
  | ADT<'togglePublicSectorAccordion'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = async () => ({
  isVendorAccordionOpen: true,
  isPublicSectorAccordionOpen: false
});

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'toggleVendorAccordion':
      return [state.update('isVendorAccordionOpen', v => !v)];
    case 'togglePublicSectorAccordion':
      return [state.update('isPublicSectorAccordionOpen', v => !v)];
    default:
      return [state];
  }
};

const TitleView: View<{}> = () => {
  return (
    <div className='bg-blue-light-alt-2 pb-5 pb-md-0'>
      <Container>
        <Row>
          <Col xs='12'>
            <h1>Code With Us</h1>
          </Col>
        </Row>
        <Row>
          <Col xs='12' md='8'><em>Code With Us</em> is a procurement mechanism for public sector organizations in British Columbia to pay developers for code.</Col>
          <Col md='4'><img className='d-none d-md-block mx-auto mb-n5' src={prefixPath('/images/illustrations/cwu-learnmore.svg')} /></Col>
        </Row>
      </Container>
    </div>
  );
};

const VendorView: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <div className='pb-5'>
      <Container>
        <Row>
          <Col xs='12' md='8'>
            <Accordion
              className='mt-6'
              toggle={() => dispatch(adt('toggleVendorAccordion'))}
              color='bcgov-blue'
              title='Vendors'
              titleClassName='h3 mb-0 ml-2'
              icon='store'
              iconColor='bcgov-blue'
              iconWidth={2}
              iconHeight={2}
              chevronWidth={2}
              chevronHeight={2}
              open={state.isVendorAccordionOpen}>
                <div className='mb-3'>We know that there are tons of brilliant tech professionals like you who never get an opportunity to apply their skills to public service. We want to change that!</div>
                <div className='mb-5'><em>Code With Us</em> makes it easy to get paid for contributing to government’s digital services by providing a process that allows you to focus on writing code, not contract paperwork.</div>
                <VendorHIW />
                <div className='d-flex flex-row mt-5 justify-content-center justify-content-md-start'>
                  <Link
                    button
                    dest={routeDest(adt('content', 'code-with-us-proposal-guide'))}
                    color='blue'
                    outline
                    symbol_={leftPlacement(iconLinkSymbol('user'))}
                    className='mr-3'
                  >
                    Read the Guide
                  </Link>
                  <Link
                    button
                    dest={routeDest(adt('opportunities', null))}
                    color='primary'
                    symbol_={leftPlacement(iconLinkSymbol('search'))}
                    className='ml-3'
                  >
                    Browse Opportunities
                  </Link>
                </div>
            </Accordion>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

const VendorHIW: View<{}> = () => {
  return (
    <div>
      <h2 className='mb-4'>How It Works</h2>
      <HowItWorksItem
        icon='search'
        foreColor='white'
        bgColor='purple'
        header='Search'
        subText='Find an opportunity that matches your skills and interest. The acceptance criteria describes what you need to deliver to get paid the fixed price.'
        className='mb-4'
      />
      <HowItWorksItem
        icon='comments'
        foreColor='white'
        bgColor='purple'
        header='Connect'
        subText='Speak directly with the opportunity contact to get more clarity. If you have suggestions, or think the price is too low, say so!'
        className='mb-4'
      />
      <HowItWorksItem
        icon='paper-plane'
        foreColor='white'
        bgColor='purple'
        header='Apply'
        subText='Submit a proposal using the app. If you are awarded the opportunity, you will be offered the exclusive right to work on the issue for a set period of time.'
        className='mb-4'
      />
      <HowItWorksItem
        icon='code'
        foreColor='white'
        bgColor='purple'
        header='Contribute'
        subText='Work collaboratively and iteratively with the opportunity contact. Commit code early and often to ensure you are on the right track.'
        className='mb-4'
      />
      <HowItWorksItem
        icon='badge-dollar'
        foreColor='white'
        bgColor='purple'
        header='Get Paid'
        subText='Once the acceptance criteria is met and your code is merged, submit your invoice and expect payment within 30 days. Read more about payment options here.'
        className='mb-4'
      />
    </div>
  );
};

const PublicSectorView: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <div className='pb-5'>
      <Container>
        <Row>
          <Col xs='12' md='8'>
            <Accordion
              className='mt-6'
              toggle={() => dispatch(adt('togglePublicSectorAccordion'))}
              color='bcgov-blue'
              title='Public Sector'
              titleClassName='h3 mb-0 ml-2'
              icon='government'
              iconColor='bcgov-blue'
              iconWidth={2}
              iconHeight={2}
              chevronWidth={2}
              chevronHeight={2}
              open={state.isPublicSectorAccordionOpen}>
                <div className='mb-3'>If you manage an open source digital product in the British Columbia public sector, <em>Code With Us</em> can help you access talented developers and pay for code quickly.</div>
                <div className='mb-5'>Post an opportunity, evaluate proposals, assign a developer and get to work!</div>
                <div className='d-flex flex-row mt-5 justify-content-center justify-content-md-start'>
                  <Link
                    button
                    dest={routeDest(adt('content', 'code-with-us-opportunity-guide'))}
                    color='blue'
                    outline
                    symbol_={leftPlacement(iconLinkSymbol('user'))}
                    className='mr-3'
                  >
                    Read the Guide
                  </Link>
                </div>
            </Accordion>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <div>
      <TitleView />
      <div className='vh-100 bg-white'>
        <VendorView state={state} dispatch={dispatch} />
        <PublicSectorView state={state} dispatch={dispatch} />
      </div>
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
