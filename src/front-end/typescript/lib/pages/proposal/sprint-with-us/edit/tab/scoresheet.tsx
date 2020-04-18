import { Route } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, Init, Update } from 'front-end/lib/framework';
import * as Tab from 'front-end/lib/pages/proposal/sprint-with-us/edit/tab';
import EditTabHeader from 'front-end/lib/pages/proposal/sprint-with-us/lib/views/edit-tab-header';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { ADT } from 'shared/lib/types';

export interface State extends Tab.Params {
  empty: true;
}

export type InnerMsg
  = ADT<'noop'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

const init: Init<Tab.Params, State> = async params => {
  return {
    ...params,
    empty: true
  };
};

const update: Update<State, Msg> = ({ state, msg }) => {
  return [state];
};

const view: ComponentView<State, Msg> = ({ state }) => {
  return (
    <div>
      <EditTabHeader proposal={state.proposal} viewerUser={state.viewerUser} />
      <Row className='mt-5'>
        <Col xs='12'>
          Empty
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
