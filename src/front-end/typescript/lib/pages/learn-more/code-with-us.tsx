import { makePageMetadata, prefixPath } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, PageComponent, PageInit, Update, View } from 'front-end/lib/framework';
// import Accordion from 'front-end/lib/views/accordion';
import React from 'react';
import { Col, Container, Row } from 'reactstrap';
import { ADT } from 'shared/lib/types';

export interface State {
  empty: true;
}

type InnerMsg
  = ADT<'noop'>
  | ADT<'toggleAccordion'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = async () => ({
  empty: true
});

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'toggleAccordion':
      return [state.update('showAccordion', v => !v)];
    default:
      return [state];
  }
};

const TitleView: View<{}> = () => {
  return (
    <div className='bg-blue-light-alt-2 pt-5'>
      <Container>
        <Row>
          <Col xs='12'>
            <h1>Code With Us</h1>
          </Col>
        </Row>
        <Row>
          <Col xs='12' md='8'><em>Code With Us</em> is a procurement mechanism for public sector organizations in British Columbia to pay developers for code.</Col>
          <Col d-none md='4'><img className='mx-auto d-block mb-n5' src={prefixPath('/images/illustrations/cwu-learnmore.svg')} /></Col>
        </Row>
      </Container>
    </div>
  );
};

// const VendorView: ComponentView<State, Msg> = ({ state, dispatch }) => {
//   return (
//     <Container>
//       <Accordion
//       className={''}
//       toggle={() => dispatch(adt('toggleAccordion', index))}
//       color='info'
//       title={title}
//       titleClassName='h3 mb-0'
//       icon='vendor'
//       iconColor={isValid ? undefined : 'warning'}
//       iconWidth={2}
//       iconHeight={2}
//       chevronWidth={1.5}
//       chevronHeight={1.5}
//       open={response.isAccordianOpen}>
//     </Accordion>
//     </Container>
//   );
// };

const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <div>
      <TitleView />
      {/* <VendorView /> */}
    </div>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  fullWidth: true,
  init,
  update,
  view,
  getMetadata() {
    return makePageMetadata('Code With Us - Learn More');
  }
};
