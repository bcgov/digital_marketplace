import { formatAmount } from 'front-end/../../shared/lib';
import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, emptyPageAlerts, GlobalComponentMsg, PageComponent, PageInit, toast, Update } from 'front-end/lib/framework';
import Icon from 'front-end/lib/views/icon';
// import Accordion from 'front-end/lib/views/accordion';
import React from 'react';
import { Button, Col, Container, Row } from 'reactstrap';
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

const view: ComponentView<State, Msg> = ({state, dispatch}) => {
  return (
    <Container xs='12'>
      <Row>
        <Col xs={{ size: 6, offset: 3 }} className='text-center mt-3'>
          <h1 style={{
            lineHeight: '60px'
          }}>
            Discover Unique Opportunities to Collaborate with the BC Public Sector.
          </h1>
        </Col>
      </Row>
      <Row>
        <Col xs={{ size: 6, offset: 3 }} className='text-center'>
          The Digital Marketplace is a new platform that will help build an ecosystem of innovation and collaboration between tech entrepreneurs and BC's public sector.
        </Col>
      </Row>
      <Row>
        <Button className='mx-auto mt-6 mb-6' color='primary'><Icon hover name='search' /><span className='ml-2'>Browse Opportunities</span></Button>
      </Row>
      <Row>
        <Col className='text-center'>
          <span style={{fontSize: '24px', fontWeight: 'bolder', verticalAlign: 'middle'}}>{formatAmount(1346)}</span>
          <span className='ml-2' style={{fontSize: '14px', color: '#6C757D', verticalAlign: 'middle'}}>Total Opportunities Awarded</span>
        </Col>
        <Col className='text-center'>
          <span style={{fontSize: '24px', fontWeight: 'bolder', verticalAlign: 'middle'}}>{formatAmount(13782000, '$')}</span>
          <span className='ml-2' style={{fontSize: '14px', lineHeight: '21px', color: '#6C757D', verticalAlign: 'middle'}}>Total Value of All Opportunities</span>
        </Col>
      </Row>
    </Container>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  getMetadata() {
    return makePageMetadata('Welcome');
  },
  getAlerts() {
    return {
      ...emptyPageAlerts()
    };
  }
};
