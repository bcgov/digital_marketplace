import { Route } from 'front-end/typescript/lib/app/types';
import * as History from 'front-end/typescript/lib/components/table/history';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, Init, mapComponentDispatch, Update, updateComponentChild } from 'front-end/typescript/lib/framework';
import { swuProposalEventToTitleCase, swuProposalStatusToColor, swuProposalStatusToTitleCase } from 'front-end/typescript/lib/pages/proposal/sprint-with-us/lib';
import ViewTabHeader from 'front-end/typescript/lib/pages/proposal/sprint-with-us/lib/views/view-tab-header';
import * as Tab from 'front-end/typescript/lib/pages/proposal/sprint-with-us/view/tab';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { hasSWUOpportunityPassedCodeChallenge } from 'shared/lib/resources/opportunity/sprint-with-us';
import { SWUProposal } from 'shared/lib/resources/proposal/sprint-with-us';
import { UserType } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';

export interface State extends Tab.Params {
  history: Immutable<History.State>;
}

export type InnerMsg
  = ADT<'history', History.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

function getHistoryItems({ history }: SWUProposal, viewerUserType: UserType): History.Item[] {
  if (!history) { return []; }
  return history
    .map(s => ({
      type: {
        text: s.type.tag === 'status' ? swuProposalStatusToTitleCase(s.type.value, viewerUserType) : swuProposalEventToTitleCase(s.type.value),
        color: s.type.tag === 'status' ? swuProposalStatusToColor(s.type.value, viewerUserType) : undefined
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
      idNamespace: 'swu-proposal-history',
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
            {hasSWUOpportunityPassedCodeChallenge(state.opportunity) && state.proposal.history !== undefined
              ? (
                  <div>
                    <h3 className='mb-4'>History</h3>
                    <History.view
                      state={state.history}
                      dispatch={mapComponentDispatch(dispatch, msg => adt('history' as const, msg))} />
                  </div>
                )
              : 'This proposal\'s history will be available once the opportunity reaches the Code Challenge.'}
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
