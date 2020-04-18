import { EMPTY_STRING } from 'front-end/config';
import { Route } from 'front-end/lib/app/types';
import * as Table from 'front-end/lib/components/table';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, Init, mapComponentDispatch, Update, updateComponentChild } from 'front-end/lib/framework';
import * as Tab from 'front-end/lib/pages/proposal/sprint-with-us/edit/tab';
import EditTabHeader from 'front-end/lib/pages/proposal/sprint-with-us/lib/views/edit-tab-header';
import { ReportCard } from 'front-end/lib/views/report-card-list';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { formatAmount } from 'shared/lib';
import { SWUProposalStatus } from 'shared/lib/resources/proposal/sprint-with-us';
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
      children: String(state.proposal.questionsScore === undefined ? EMPTY_STRING : state.proposal.questionsScore)
    },
    {
      children: String(state.proposal.challengeScore === undefined ? EMPTY_STRING : state.proposal.challengeScore)
    },
    {
      children: String(state.proposal.scenarioScore === undefined ? EMPTY_STRING : state.proposal.scenarioScore)
    },
    {
      children: String(state.proposal.priceScore === undefined ? EMPTY_STRING : state.proposal.priceScore)
    },
    {
      children: String(state.proposal.totalScore === undefined ? EMPTY_STRING : state.proposal.totalScore)
    }
  ]];
}

const Rank: ComponentView<State, Msg> = ({ state }) => {
  const show
     = state.proposal.status === SWUProposalStatus.Awarded
    || state.proposal.status === SWUProposalStatus.NotAwarded;
  if (!show || !state.proposal.rank) { return null; }
  return (
    <Row>
      <Col>
        <div className='mt-5'>
          <ReportCard
            icon='trophy'
            name='Ranking'
            iconColor='yellow'
            value={formatAmount(state.proposal.rank, undefined, true)} />
        </div>
      </Col>
    </Row>
  );
};

const Scoresheet: ComponentView<State, Msg> = ({ state, dispatch }) => {
  const show
     = state.proposal.status === SWUProposalStatus.Awarded
    || state.proposal.status === SWUProposalStatus.NotAwarded;
  if (!show) { return null; }
  return (
    <Row>
      <Col xs='12'>
        <div className='mt-5 pt-5 border-top'>
          <Table.view
            headCells={tableHeadCells(state)}
            bodyRows={tableBodyRows(state)}
            state={state.table}
            dispatch={mapComponentDispatch(dispatch, v => adt('table' as const, v))} />
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
