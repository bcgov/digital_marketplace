import { EMPTY_STRING } from 'front-end/typescript/config';
import { Route } from 'front-end/typescript/lib/app/types';
import * as Table from 'front-end/typescript/lib/components/table';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, Init, mapComponentDispatch, Update, updateComponentChild, View } from 'front-end/typescript/lib/framework';
import * as Tab from 'front-end/typescript/lib/pages/proposal/sprint-with-us/edit/tab';
import { swuProposalStatusToTitleCase } from 'front-end/typescript/lib/pages/proposal/sprint-with-us/lib';
import EditTabHeader from 'front-end/typescript/lib/pages/proposal/sprint-with-us/lib/views/edit-tab-header';
import ReportCardList from 'front-end/typescript/lib/views/report-card-list';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { formatAmount } from 'shared/lib';
import { NUM_SCORE_DECIMALS, showScoreAndRankToProponent, SWUProposalStatus } from 'shared/lib/resources/proposal/sprint-with-us';
import { UserType } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';

export interface State extends Tab.Params {
  table: Immutable<Table.State>;
}

export type InnerMsg
  = ADT<'table', Table.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

const init: Init<Tab.Params, State> = async params => {
  return {
    ...params,
    table: immutable(await Table.init({
      idNamespace: 'swu-proposal-edit-scoresheet'
    }))
  };
};

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'table':
      return updateComponentChild({
        state,
        childStatePath: ['table'],
        childUpdate: Table.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('table', value)
      });
    default:
      return [state];
  }
};

function tableHeadCells(state: Immutable<State>): Table.HeadCells {
  return [
    {
      children: 'Team Questions',
      className: 'text-nowrap'
    },
    {
      children: 'Code Challenge',
      className: 'text-nowrap'
    },
    {
      children: 'Team Scenario',
      className: 'text-nowrap'
    },
    {
      children: 'Price',
      className: 'text-nowrap'
    },
    {
      children: 'Total Score',
      className: 'text-nowrap'
    }
  ];
}

function tableBodyRows(state: Immutable<State>): Table.BodyRows {
  return [[
    {
      children: String(state.proposal.questionsScore === undefined ? EMPTY_STRING : `${state.proposal.questionsScore.toFixed(NUM_SCORE_DECIMALS)}%`)
    },
    {
      children: String(state.proposal.challengeScore === undefined ? EMPTY_STRING : `${state.proposal.challengeScore.toFixed(NUM_SCORE_DECIMALS)}%`)
    },
    {
      children: String(state.proposal.scenarioScore === undefined ? EMPTY_STRING : `${state.proposal.scenarioScore.toFixed(NUM_SCORE_DECIMALS)}%`)
    },
    {
      children: String(state.proposal.priceScore === undefined ? EMPTY_STRING : `${state.proposal.priceScore.toFixed(NUM_SCORE_DECIMALS)}%`)
    },
    {
      children: String(state.proposal.totalScore === undefined ? EMPTY_STRING : `${state.proposal.totalScore.toFixed(NUM_SCORE_DECIMALS)}%`)
    }
  ]];
}

const Rank: ComponentView<State, Msg> = ({ state }) => {
  if (!showScoreAndRankToProponent(state.proposal) || !state.proposal.rank) { return null; }
  return (
    <Row>
      <Col>
        <div className='mt-5'>
          <ReportCardList
            reportCards={[{
              icon: 'trophy',
              name: 'Ranking',
              iconColor: 'c-report-card-icon-highlight',
              value: formatAmount(state.proposal.rank, undefined, true)
            }]} />
        </div>
      </Col>
    </Row>
  );
};

const NotAvailable: View<Pick<State, 'proposal'>> = ({ proposal }) => {
  switch (proposal.status) {
    case SWUProposalStatus.Disqualified:
    case SWUProposalStatus.Withdrawn:
      const withdrawn = swuProposalStatusToTitleCase(SWUProposalStatus.Withdrawn, UserType.Vendor);
      const disqualified = swuProposalStatusToTitleCase(SWUProposalStatus.Disqualified, UserType.Vendor);
      return (<div>Scoresheets are not available for {withdrawn} or {disqualified} proposals.</div>);
    default:
      return (<div>This proposal's scoresheet will be available once the opportunity has been awarded.</div>);
  }
};

const Scoresheet: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <Row>
      <Col xs='12'>
        <div className='mt-5 pt-5 border-top'>
          <h3 className='mb-4'>Scoresheet</h3>
          {showScoreAndRankToProponent(state.proposal)
            ? (<Table.view
                headCells={tableHeadCells(state)}
                bodyRows={tableBodyRows(state)}
                state={state.table}
                dispatch={mapComponentDispatch(dispatch, v => adt('table' as const, v))} />)
            : (<NotAvailable proposal={state.proposal} />)}
        </div>
      </Col>
    </Row>
  );
};

const view: ComponentView<State, Msg> = props => {
  const { state } = props;
  return (
    <div>
      <EditTabHeader proposal={state.proposal} viewerUser={state.viewerUser} />
      <Rank {...props} />
      <Scoresheet {...props} />
    </div>
  );
};

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view
};
