import { Route } from 'front-end/lib/app/types';
import * as History from 'front-end/lib/components/table/history';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, Init, mapComponentDispatch, Update, updateComponentChild } from 'front-end/lib/framework';
import * as Tab from 'front-end/lib/pages/opportunity/code-with-us/edit/tab';
import { opportunityToHistoryItems } from 'front-end/lib/pages/opportunity/code-with-us/lib';
import EditTabHeader from 'front-end/lib/pages/opportunity/code-with-us/lib/views/edit-tab-header';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { adt, ADT } from 'shared/lib/types';

export interface State extends Tab.Params {
  history: Immutable<History.State>;
}

export type InnerMsg
  = ADT<'history', History.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

const init: Init<Tab.Params, State> = async params => {
  return {
    ...params,
    history: immutable(await History.init({
      idNamespace: 'cwu-opportunity-history',
      items: opportunityToHistoryItems(params.opportunity),
      viewerUser: params.viewerUser
    }))
  };
};

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'history':
      return updateComponentChild({
        state,
        childStatePath: ['history'],
        childUpdate: History.update,
        childMsg: msg.value,
        mapChildMsg: value => ({ tag: 'history', value })
      });
    default:
      return [state];
  }
};

const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <div>
      <EditTabHeader opportunity={state.opportunity} viewerUser={state.viewerUser} />
      <div className='mt-5 pt-5 border-top'>
        <Row>
          <Col xs='12'>
            <h3 className='mb-4'>History</h3>
            <History.view
              state={state.history}
              dispatch={mapComponentDispatch(dispatch, msg => adt('history' as const, msg))} />
          </Col>
        </Row>
      </div>
    </div>
  );
};

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view
};
