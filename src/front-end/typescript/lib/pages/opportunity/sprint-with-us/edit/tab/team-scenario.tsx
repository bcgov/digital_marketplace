import { EMPTY_STRING } from 'front-end/config';
import { Route } from 'front-end/lib/app/types';
import * as Table from 'front-end/lib/components/table';
import { ComponentView, Dispatch, GlobalComponentMsg, immutable, Immutable, Init,  mapComponentDispatch, Update, updateComponentChild, View } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Tab from 'front-end/lib/pages/opportunity/sprint-with-us/edit/tab';
import EditTabHeader from 'front-end/lib/pages/opportunity/sprint-with-us/lib/views/edit-tab-header';
import { swuProposalStatusToColor, swuProposalStatusToTitleCase } from 'front-end/lib/pages/proposal/sprint-with-us/lib';
import Badge from 'front-end/lib/views/badge';
import Link, { routeDest } from 'front-end/lib/views/link';
import ReportCardList, { ReportCard } from 'front-end/lib/views/report-card-list';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { compareNumbers } from 'shared/lib';
import { canViewSWUOpportunityProposals, hasSWUOpportunityPassedTeamScenario, SWUOpportunity } from 'shared/lib/resources/opportunity/sprint-with-us';
import { getSWUProponentName, isSWUProposalInTeamScenario, NUM_SCORE_DECIMALS, SWUProposalSlim, SWUProposalStatus } from 'shared/lib/resources/proposal/sprint-with-us';
import { ADT, adt } from 'shared/lib/types';

export interface State extends Tab.Params {
  canViewProposals: boolean;
  proposals: SWUProposalSlim[];
  table: Immutable<Table.State>;
}

export type InnerMsg
  = ADT<'table', Table.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

const init: Init<Tab.Params, State> = async params => {
  const canViewProposals = canViewSWUOpportunityProposals(params.opportunity) && hasSWUOpportunityPassedTeamScenario(params.opportunity);
  let proposals: SWUProposalSlim[] = [];
  if (canViewProposals) {
    const proposalResult = await api.proposals.swu.readMany(params.opportunity.id);
    proposals = api
      .getValidValue(proposalResult, [])
      .filter(p => isSWUProposalInTeamScenario(p))
      .sort((a, b) => {
        // Disqualified and Withdrawn statuses come last.
        if (a.status === SWUProposalStatus.Disqualified || a.status === SWUProposalStatus.Withdrawn) {
          if (b.status === SWUProposalStatus.Disqualified || b.status === SWUProposalStatus.Withdrawn) {
            return 0;
          } else {
            return 1;
          }
        }
        // Compare by score.
        // Give precendence to unscored proposals.
        if (a.scenarioScore === undefined && b.scenarioScore !== undefined) { return -1; }
        if (a.scenarioScore !== undefined && b.scenarioScore === undefined) { return 1; }
        if (a.scenarioScore !== undefined && b.scenarioScore !== undefined) {
          // If scores are not the same, sort by score.
          const result = compareNumbers(a.scenarioScore, b.scenarioScore);
          if (result) { return result; }
        }
        // Fallback to sorting by proponent name.
        return getSWUProponentName(a).localeCompare(getSWUProponentName(b));
      });
  }
  return {
    canViewProposals: canViewProposals && !!proposals.length,
    proposals,
    table: immutable(await Table.init({
      idNamespace: 'proposal-table'
    })),
    ...params
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
        mapChildMsg: value => ({ tag: 'table', value })
      });

    default:
      return [state];
  }
};

const makeCardData = (opportunity: SWUOpportunity, proposals: SWUProposalSlim[]): ReportCard[]  => {
  const numProposals = proposals.length;
  const [highestScore, averageScore] = proposals.reduce(([highest, average], { scenarioScore }, i) => {
    if (!scenarioScore) { return [highest, average]; }
    return [
      scenarioScore > highest ? scenarioScore : highest,
      (average * i + scenarioScore) / (i + 1)
    ];
  }, [0, 0]);
  const isComplete = hasSWUOpportunityPassedTeamScenario(opportunity);
  return [
    {
      icon: 'users',
      name: `Participant${numProposals === 1 ? '' : 's'}`,
      value: numProposals ? String(numProposals) : EMPTY_STRING
    },
    {
      icon: 'star-full',
      iconColor: 'yellow',
      name: 'Top TS Score',
      value: isComplete && highestScore ? `${highestScore.toFixed(NUM_SCORE_DECIMALS)}%` : EMPTY_STRING
    },
    {
      icon: 'star-half',
      iconColor: 'yellow',
      name: 'Avg. TS Score',
      value: isComplete && averageScore ? `${averageScore.toFixed(NUM_SCORE_DECIMALS)}%` : EMPTY_STRING
    }
  ];
};

const WaitForTeamScenario: ComponentView<State, Msg> = ({ state }) => {
  return (<div>Participants will be displayed here once the opportunity has reached the Team Scenario.</div>);
};

interface ProponentCellProps {
  proposal: SWUProposalSlim;
  opportunity: SWUOpportunity;
  disabled: boolean;
}

const ProponentCell: View<ProponentCellProps> = ({ proposal, opportunity, disabled }) => {
  const proposalRouteParams = {
    proposalId: proposal.id,
    opportunityId: opportunity.id,
    tab: 'teamScenario' as const
  };
  return (
    <div>
      <Link disabled={disabled} dest={routeDest(adt('proposalSWUView', proposalRouteParams))}>{getSWUProponentName(proposal)}</Link>
      {(() => {
        if (!proposal.organization) { return null; }
        return (
          <div className='small text-secondary text-uppercase'>
            {proposal.anonymousProponentName}
          </div>
        );
      })()}
    </div>
  );
};

function evaluationTableBodyRows(state: Immutable<State>, dispatch: Dispatch<Msg>): Table.BodyRows  {
  return state.proposals.map(p => {
    return [
      {
        className: 'text-wrap',
        children: (
          <ProponentCell
            proposal={p}
            disabled={false}
            opportunity={state.opportunity} />
        )
      },
      { children: (<Badge text={swuProposalStatusToTitleCase(p.status, state.viewerUser.type)} color={swuProposalStatusToColor(p.status, state.viewerUser.type)} />) },
      {
        className: 'text-center',
        children: (<div>{p.scenarioScore ? `${p.scenarioScore.toFixed(NUM_SCORE_DECIMALS)}%` : EMPTY_STRING}</div>)
      }
    ];
  });
}

function evaluationTableHeadCells(state: Immutable<State>): Table.HeadCells {
  return [
    {
      children: 'Proponent',
      className: 'text-nowrap',
      style: { width: '100%', minWidth: '240px' }
    },
    {
      children: 'Status',
      className: 'text-nowrap',
      style: { width: '0px' }
    },
    {
      children: 'Team Scenario',
      className: 'text-nowrap text-center',
      style: { width: '0px' }
    }
  ];
}

const EvaluationTable: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <Table.view
      headCells={evaluationTableHeadCells(state)}
      bodyRows={evaluationTableBodyRows(state, dispatch)}
      state={state.table}
      dispatch={mapComponentDispatch(dispatch, msg => adt('table' as const, msg))} />
  );
};

const view: ComponentView<State, Msg> = (props) => {
  const { state } = props;
  const opportunity = state.opportunity;
  const cardData = makeCardData(opportunity, state.proposals);
  return (
    <div>
      <EditTabHeader opportunity={opportunity} viewerUser={state.viewerUser} />
      <Row className='mt-5'>
        <Col xs='12'>
          <ReportCardList reportCards={cardData} />
        </Col>
      </Row>
      <div className='border-top mt-5 pt-5'>
        <Row>
          <Col xs='12' className='d-flex flex-column flex-md-row justify-content-md-between align-items-start align-items-md-center mb-4'>
            <h4 className='mb-0'>Team Scenario Participants</h4>
          </Col>
          <Col xs='12'>
            {state.canViewProposals
              ? (<EvaluationTable {...props} />)
              : (<WaitForTeamScenario {...props} />)}
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
