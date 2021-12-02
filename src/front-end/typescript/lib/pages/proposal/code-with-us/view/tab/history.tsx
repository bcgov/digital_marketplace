import { Route } from 'front-end/typescript/lib/app/types';
import * as History from 'front-end/typescript/lib/components/table/history';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, Init, mapComponentDispatch, Update, updateComponentChild } from 'front-end/typescript/lib/framework';
import * as Tab from 'front-end/typescript/lib/pages/proposal/code-with-us/edit/tab';
import { cwuProposalEventToTitleCase, cwuProposalStatusToColor, cwuProposalStatusToTitleCase } from 'front-end/typescript/lib/pages/proposal/code-with-us/lib';
import ViewTabHeader from 'front-end/typescript/lib/pages/proposal/code-with-us/lib/views/view-tab-header';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { CWUProposal } from 'shared/lib/resources/proposal/code-with-us';
import { UserType } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';

export interface State extends Tab.Params {
  history: Immutable<History.State>;
}

export type InnerMsg
  = ADT<'history', History.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

function getHistoryItems({ history }: CWUProposal, viewerUserType: UserType): History.Item[] {
  if (!history) { return []; }
  return history
    .map(s => ({
      type: {
        text: s.type.tag === 'status' ? cwuProposalStatusToTitleCase(s.type.value, viewerUserType) : cwuProposalEventToTitleCase(s.type.value),
        color: s.type.tag === 'status' ? cwuProposalStatusToColor(s.type.value, viewerUserType) : undefined
      },
      note: s.note,
      createdAt: s.createdAt,
      createdBy: s.createdBy || undefined
    }));
}

const init: Init<Tab.Params, State> = async params => {
  return {
    ...params,
    history: immutable(await History.init({
      idNamespace: 'cwu-proposal-history',
      items: getHistoryItems(params.proposal, params.viewerUser.type),
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
      <ViewTabHeader proposal={state.proposal} viewerUser={state.viewerUser} />
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
