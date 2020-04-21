import { EMPTY_STRING } from 'front-end/config';
import { Route } from 'front-end/lib/app/types';
import * as Table from 'front-end/lib/components/table';
import { ComponentView, Dispatch, GlobalComponentMsg, immutable, Immutable,  Init, mapComponentDispatch, toast, Update, updateComponentChild, View } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Tab from 'front-end/lib/pages/opportunity/code-with-us/edit/tab';
import * as toasts from 'front-end/lib/pages/opportunity/code-with-us/lib/toasts';
import EditTabHeader from 'front-end/lib/pages/opportunity/code-with-us/lib/views/edit-tab-header';
import { cwuProposalStatusToColor, cwuProposalStatusToTitleCase } from 'front-end/lib/pages/proposal/code-with-us/lib';
import Badge from 'front-end/lib/views/badge';
import Link, { iconLinkSymbol, leftPlacement, rightPlacement, routeDest } from 'front-end/lib/views/link';
import ReportCardList, { ReportCard } from 'front-end/lib/views/report-card-list';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { compareNumbers } from 'shared/lib';
import { canCWUOpportunityBeAwarded, canViewCWUOpportunityProposals, CWUOpportunity, CWUOpportunityStatus } from 'shared/lib/resources/opportunity/code-with-us';
import { canCWUProposalBeAwarded, CWUProposalSlim, CWUProposalStatus, getCWUProponentName } from 'shared/lib/resources/proposal/code-with-us';
import { isAdmin } from 'shared/lib/resources/user';
import { ADT, adt, Id } from 'shared/lib/types';

type ModalId = ADT<'award', Id>;

export interface State extends Tab.Params {
  showModal: ModalId | null;
  awardLoading: Id | null;
  canProposalsBeAwarded: boolean;
  canViewProposals: boolean;
  proposals: CWUProposalSlim[];
  table: Immutable<Table.State>;
}

export type InnerMsg
  = ADT<'table', Table.Msg>
  | ADT<'showModal', ModalId>
  | ADT<'hideModal'>
  | ADT<'award', Id>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

const init: Init<Tab.Params, State> = async params => {
  const canViewProposals = canViewCWUOpportunityProposals(params.opportunity);
  let proposals: CWUProposalSlim[] = [];
  if (canViewProposals) {
    const proposalResult = await api.proposals.cwu.readMany(params.opportunity.id);
    proposals = api
      .getValidValue(proposalResult, [])
      .sort((a, b) => {
        // Disqualified and Withdrawn statuses come last.
        if (a.status === CWUProposalStatus.Disqualified || a.status === CWUProposalStatus.Withdrawn) {
          if (b.status === CWUProposalStatus.Disqualified || b.status === CWUProposalStatus.Withdrawn) {
            return 0;
          } else {
            return 1;
          }
        }
        // Compare by score.
        // Give precendence to unscored proposals.
        if (a.score === undefined && b.score !== undefined) { return -1; }
        if (a.score !== undefined && b.score === undefined) { return 1; }
        if (a.score !== undefined && b.score !== undefined) {
          // If scores are not the same, sort by score.
          const result = compareNumbers(a.score, b.score);
          if (result) { return result; }
        }
        // Fallback to sorting by proponent name.
        return getCWUProponentName(a).localeCompare(getCWUProponentName(b));
      });
  }
  return {
    awardLoading: null,
    showModal: null,
    canViewProposals,
    // Determine whether the "Award" button should be shown at all.
    // Can be awarded if...
    // - Opportunity has the appropriate status; and
    // - At least one proposal can be awarded.
    canProposalsBeAwarded: canCWUOpportunityBeAwarded(params.opportunity) && proposals.reduce((acc, p) =>
      acc || canCWUProposalBeAwarded(p),
      false as boolean
    ),
    proposals,
    table: immutable(await Table.init({
      idNamespace: 'proposal-table'
    })),
    ...params
  };
};

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {

    case 'award':
      state = state.set('showModal', null);
      return [
        state.set('awardLoading', msg.value),
        async (state, dispatch) => {
          state = state.set('awardLoading', null);
          const updateResult = await api.proposals.cwu.update(msg.value, adt('award', ''));
          switch (updateResult.tag) {
            case 'valid':
              dispatch(toast(adt('success', toasts.statusChanged.success(CWUOpportunityStatus.Awarded))));
              return immutable(await init({
                opportunity: api.getValidValue(await api.opportunities.cwu.readOne(state.opportunity.id), state.opportunity),
                viewerUser: state.viewerUser
              }));
            case 'invalid':
            case 'unhandled':
              dispatch(toast(adt('error', toasts.statusChanged.error(CWUOpportunityStatus.Awarded))));
              return state;
          }
      }];

    case 'showModal':
      return [state.set('showModal', msg.value)];

    case 'hideModal':
      return [state.set('showModal', null)];

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

const makeCardData = (opportunity: CWUOpportunity, proposals: CWUProposalSlim[]): ReportCard[]  => {
  const numProposals = proposals.length;
  const [highestScore, averageScore] = proposals.reduce(([highest, average], { score }, i) => {
    if (!score) { return [highest, average]; }
    return [
      score > highest ? score : highest,
      (average * i + score) / (i + 1)
    ];
  }, [0, 0]);
  const isAwarded = opportunity.status === CWUOpportunityStatus.Awarded;
  return [
    {
      icon: 'comment-dollar',
      name: `Proposal${numProposals === 1 ? '' : 's'}`,
      value: numProposals ? String(numProposals) : EMPTY_STRING
    },
    {
      icon: 'star-full',
      iconColor: 'yellow',
      name: 'Winning Score',
      value: isAwarded && highestScore ? `${highestScore}%` : EMPTY_STRING
    },
    {
      icon: 'star-half',
      iconColor: 'yellow',
      name: 'Avg. Score',
      value: isAwarded && averageScore ? `${averageScore}%` : EMPTY_STRING
    }
  ];
};

const WaitForOpportunityToClose: ComponentView<State, Msg> = ({ state }) => {
  return (<div>Proposals will be displayed here once the opportunity has closed.</div>);
};

const ContextMenuCell: View<{ loading: boolean; proposal: CWUProposalSlim; dispatch: Dispatch<Msg>; }> = ({ loading, proposal, dispatch }) => {
  return (
    <Link
      button
      symbol_={leftPlacement(iconLinkSymbol('award'))}
      color='primary'
      size='sm'
      loading={loading}
      onClick={() => dispatch(adt('showModal', adt('award' as const, proposal.id))) }>
      Award
    </Link>
  );
};

interface ProponentCellProps {
  proposal: CWUProposalSlim;
  opportunity: CWUOpportunity;
  disabled: boolean;
  linkToProfile: boolean;
}

const ProponentCell: View<ProponentCellProps> = ({ proposal, opportunity, disabled, linkToProfile }) => {
  const proposalRouteParams = {
    proposalId: proposal.id,
    opportunityId: opportunity.id
  };
  return (
    <div>
      <Link disabled={disabled} dest={routeDest(adt('proposalCWUView', proposalRouteParams))}>{getCWUProponentName(proposal)}</Link>
      <div className='small text-secondary text-uppercase'>
        {linkToProfile
          ? (<Link disabled={disabled} color='secondary' dest={routeDest(adt('userProfile', { userId: proposal.createdBy.id }))}>
              {proposal.createdBy.name}
            </Link>)
          : proposal.createdBy.name}
      </div>
    </div>
  );
};

function evaluationTableBodyRows(state: Immutable<State>, dispatch: Dispatch<Msg>): Table.BodyRows  {
  return state.proposals.map(p => {
    return [
      {
        className: 'text-nowrap',
        children: (
          <ProponentCell
            proposal={p}
            opportunity={state.opportunity}
            linkToProfile={isAdmin(state.viewerUser)}
            disabled={!!state.awardLoading} />
        )
      },
      { children: (<Badge text={cwuProposalStatusToTitleCase(p.status, state.viewerUser.type)} color={cwuProposalStatusToColor(p.status, state.viewerUser.type)} />) },
      {
        className: 'text-center',
        children: (<div>{p.score ? `${p.score}%` : EMPTY_STRING}</div>)
      },
      ...(state.canProposalsBeAwarded
        ? [{
            showOnHover: true,
            children: canCWUProposalBeAwarded(p) ? (<ContextMenuCell dispatch={dispatch} proposal={p} loading={state.awardLoading === p.id} />) : null
          }]
        : [])
    ];
  });
}

function evaluationTableHeadCells(state: Immutable<State>): Table.HeadCells {
  return [
    {
      children: 'Proponent',
      className: 'text-wrap',
      style: { width: '100%', minWidth: '240px' }
    },
    {
      children: 'Status',
      className: 'text-nowrap',
      style: { width: '0px' }
    },
    {
      children: 'Score',
      className: 'text-nowrap text-center',
      style: { width: '0px' }
    },
    ...(state.canProposalsBeAwarded
      ? [{
          children: '',
          className: 'text-nowrap text-right',
          style: { width: '0px' }
        }]
      : [])
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
            <h4 className='mb-0'>Proposals</h4>
            {state.canViewProposals
              ? (<Link
                  newTab
                  color='info'
                  className='mt-3 mt-md-0'
                  symbol_={rightPlacement(iconLinkSymbol('file-export'))}
                  dest={routeDest(adt('proposalCWUExportAll', { opportunityId: opportunity.id }))}>
                  Export All Proposals
                </Link>)
              : null}
          </Col>
          <Col xs='12'>
            {state.canViewProposals
              ? (<EvaluationTable {...props} />)
              : (<WaitForOpportunityToClose {...props} />)}
          </Col>
        </Row>
      </div>
    </div>
  );
};

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view,

  getModal: state => {
    if (!state.showModal) { return null; }
    switch (state.showModal.tag) {
      case 'award':
        return {
          title: 'Award Code With Us Opportunity?',
          onCloseMsg: adt('hideModal'),
          actions: [
            {
              text: 'Award Opportunity',
              icon: 'award',
              color: 'primary',
              button: true,
              msg: adt('award', state.showModal.value)
            },
            {
              text: 'Cancel',
              color: 'secondary',
              msg: adt('hideModal')
            }
          ],
          body: () => 'Are you sure you want to award this opportunity to this vendor? Once awarded, all subscribers and vendors with submitted proposals will be notified accordingly.'
        };
    }
  }
};
