import { makePageMetadata, prefixPath } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, PageComponent, PageInit, Update, View } from 'front-end/lib/framework';
import Accordion from 'front-end/lib/views/accordion';
import HowItWorksItem from 'front-end/lib/views/how-it-works-item';
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

const TitleView: View = () => {
  return (
    <div className='bg-blue-light-alt pt-4 pb-6 pb-md-7'>
      <Container>
        <Row>
          <Col xs='12'>
            <h1 className='mb-4'>Code With Us</h1>
          </Col>
        </Row>
        <Row>
          <Col xs='12' md='8'>
            <p className='mb-0'><em>Code With Us</em> is a procurement mechanism for public sector organizations in British Columbia to pay developers for code.</p>
          </Col>
          <Col md='4'>
            <img className='d-none d-md-block position-absolute ml-6' src={prefixPath('/images/illustrations/code_with_us_learn_more.svg')} />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

const VendorView: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <div className='bg-white pt-6'>
      <Container>
        <Row>
          <Col xs='12' md='8'>
            <Accordion
              toggle={() => dispatch(adt('toggleVendorAccordion'))}
              color='info'
              title='Vendors'
              titleClassName='h2 mb-0 ml-2'
              icon='store'
              iconColor='info'
              iconWidth={2.5}
              iconHeight={2.5}
              chevronWidth={2}
              chevronHeight={2}
              open={state.isVendorAccordionOpen}>
                <div className='mb-3'>We know that there are tons of brilliant tech professionals like you who never get an opportunity to apply their skills to public service. We want to change that!</div>
                <div className='mb-5'><em>Code With Us</em> makes it easy to get paid for contributing to government’s digital services by providing a process that allows you to focus on writing code, not contract paperwork.</div>
                <VendorHIW />
                <div className='d-flex flex-row mt-5 flex-nowrap'>
                  <Link
                    button
                    dest={routeDest(adt('content', 'code-with-us-proposal-guide'))}
                    color='info'
                    outline
                    symbol_={leftPlacement(iconLinkSymbol('book-user'))}
                    className='mr-3 text-nowrap'
                  >
                    Read the Guide
                  </Link>
                  <Link
                    button
                    dest={routeDest(adt('opportunities', null))}
                    color='primary'
                    symbol_={leftPlacement(iconLinkSymbol('search'))}
                    className='ml-3 text-nowrap'
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

const VendorHIW: View = () => {
  return (
    <div>
      <h3 className='mb-4'>How It Works</h3>
      <HowItWorksItem
        symbol_={adt('icon', 'search' as const)}
        fgColor='white'
        bgColor='purple'
        title='Search'
        description='Find an opportunity that matches your skills and interest. The acceptance criteria describes what you need to deliver to get paid the fixed price.'
        className='mb-4'
      />
      <HowItWorksItem
        symbol_={adt('icon', 'comments-alt' as const)}
        fgColor='white'
        bgColor='purple'
        title='Connect'
        description='Speak directly with the opportunity contact to get more clarity. If you have suggestions, or think the price is too low, say so!'
        className='mb-4'
      />
      <HowItWorksItem
        symbol_={adt('icon', 'paper-plane' as const)}
        fgColor='white'
        bgColor='purple'
        title='Apply'
        description='Submit a proposal using the app. If you are awarded the opportunity, you will be offered the exclusive right to work on the issue for a set period of time.'
        className='mb-4'
      />
      <HowItWorksItem
        symbol_={adt('icon', 'code-solid' as const)}
        fgColor='white'
        bgColor='purple'
        title='Contribute'
        description='Work collaboratively and iteratively with the opportunity contact. Commit code early and often to ensure you are on the right track.'
        className='mb-4'
      />
      <HowItWorksItem
        symbol_={adt('icon', 'sack-dollar' as const)}
        fgColor='white'
        bgColor='purple'
        title='Get Paid'
        description={(<p>Once the acceptance criteria is met and your code is merged, submit your invoice and expect payment within 30 days. Read more about payment options <Link dest={adt('external', 'https://github.com/BCDevExchange/code-with-us/wiki/4.-Payment')}>here</Link>.</p>)}
        className='mb-4'
      />
    </div>
  );
};

const PublicSectorView: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <div className='bg-white pt-5 pb-6'>
      <Container>
        <Row>
          <Col xs='12' md='8'>
            <Accordion
              toggle={() => dispatch(adt('togglePublicSectorAccordion'))}
              color='info'
              title='Public Sector'
              titleClassName='h2 mb-0 ml-2'
              icon='government'
              iconColor='info'
              iconWidth={2.5}
              iconHeight={2.5}
              chevronWidth={2}
              chevronHeight={2}
              open={state.isPublicSectorAccordionOpen}>
                <div className='mb-3'>If you manage an open source digital product in the British Columbia public sector, <em>Code With Us</em> can help you access talented developers and pay for code quickly.</div>
                <div className='mb-5'>Post an opportunity, evaluate proposals, assign a developer and get to work!</div>
                <div className='d-flex flex-row mt-5 flex-nowrap'>
                  <Link
                    button
                    dest={routeDest(adt('content', 'code-with-us-opportunity-guide'))}
                    color='info'
                    outline
                    symbol_={leftPlacement(iconLinkSymbol('book-user'))}
                    className='mr-3 text-nowrap'
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
    <div className='d-flex flex-column flex-grow-1'>
      <TitleView />
      <VendorView state={state} dispatch={dispatch} />
      <PublicSectorView state={state} dispatch={dispatch} />
      <div className='flex-grow-1 bg-white'></div>
    </div>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  fullWidth: true,
  backgroundColor: 'blue-light-alt',
  init,
  update,
  view,
  getMetadata() {
    return makePageMetadata('Code With Us - Learn More');
  }
};
