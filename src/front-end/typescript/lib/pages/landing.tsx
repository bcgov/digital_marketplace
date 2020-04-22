import { formatAmount } from 'front-end/../../shared/lib';
import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, PageComponent, PageInit, toast, Update, View } from 'front-end/lib/framework';
import Link, { iconLinkSymbol, leftPlacement, routeDest } from 'front-end/lib/views/link';
// import Accordion from 'front-end/lib/views/accordion';
import React from 'react';
import { Col, Container, Row } from 'reactstrap';
import { adt, ADT } from 'shared/lib/types';

export interface State {
  toast: [string, string];
  showAccordion: boolean;
}

type InnerMsg
  = ADT<'noop'>
  | ADT<'showToast'>
  | ADT<'toggleAccordion'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = async () => ({
  toast: [
    'Example Toast',
    'This is an example toast. This is an example toast. This is an example toast. This is an example toast.'
  ],
  showAccordion: false
});

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'showToast':
      return [
        state,
        async (state, dispatch) => {
          dispatch(toast(adt('info', {
            title: state.toast[0],
            body: state.toast[1]
          })));
          return null;
        }
      ];
    case 'toggleAccordion':
      return [state.update('showAccordion', v => !v)];
    default:
      return [state];
  }
};

const Hero: View<{}> = () => {
  return (
    <Container className='pb-5'>
      <Row className='justify-content-center text-center'>
        <Col xs='12' md='6'>
          <h1 style={{lineHeight: '3.75rem'}}>
            Discover Unique Opportunities to Collaborate with the BC Public Sector.
          </h1>
        </Col>
      </Row>
      <Row className='justify-content-center text-center'>
        <Col xs='12' md='6' className='mt-3'>
          The Digital Marketplace is a new platform that will help build an ecosystem of innovation and collaboration between tech entrepreneurs and BC's public sector.
        </Col>
      </Row>
      <Row className='mt-5 mb-6'>
        <Col xs='12' className='d-flex justify-content-center'>
          <Link
            button
            symbol_={leftPlacement(iconLinkSymbol('search'))}
            dest={routeDest(adt('opportunities', null))}
            color='primary'>
            Browse Opportunities
          </Link>
        </Col>
      </Row>
      <Row className='text-nowrap'>
        <Col xs='12'>
          <div className='d-flex flex-column flex-md-row justify-content-center align-items-center'>
            <div className='d-flex flex-column flex-md-row justify-content-center align-items-center mr-md-6 mb-4 mb-md-0'>
              <div className='h4 mb-2 mb-md-0 font-weight-bold'>{formatAmount(1346)}</div>
              <div className='ml-md-3 font-size-small text-secondary'>Total Opportunities Awarded</div>
            </div>
            <div className='d-flex flex-column flex-md-row justify-content-center align-items-center'>
              <div className='h4 mb-2 mb-md-0 font-weight-bold'>{formatAmount(13782000, '$')}</div>
              <div className='ml-md-3 font-size-small text-secondary'>Total Value of All Opportunities</div>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

const Programs: View<{}> = () => {
  return (
    <div className='bg-blue-light-alt-2 py-5'>
      <Container>
        <Row>
          <Col xs='12' md='6'>
            CWU
          </Col>
          <Col xs='12' md='6'>
            SWU
          </Col>
        </Row>
      </Container>
    </div>
  );
};

const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <div>
      <Hero />
      <Programs />
    </div>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  fullWidth: true,
  init,
  update,
  view,
  getMetadata() {
    return makePageMetadata('Welcome');
  }
};
