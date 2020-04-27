import { getAlertsValid, makePageMetadata, prefixPath, updateValid, viewValid } from 'front-end/lib';
import { isSignedIn } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as Table from 'front-end/lib/components/table';
import { ComponentView, Dispatch, GlobalComponentMsg, immutable, Immutable, mapComponentDispatch, PageComponent, PageInit, replaceRoute, Update, updateComponentChild, View } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import { cwuOpportunityStatusToColor, cwuOpportunityStatusToTitleCase } from 'front-end/lib/pages/opportunity/code-with-us/lib';
import { swuOpportunityStatusToColor, swuOpportunityStatusToTitleCase } from 'front-end/lib/pages/opportunity/sprint-with-us/lib';
import { cwuProposalStatusToColor, cwuProposalStatusToTitleCase } from 'front-end/lib/pages/proposal/code-with-us/lib';
import { swuProposalStatusToColor, swuProposalStatusToTitleCase } from 'front-end/lib/pages/proposal/sprint-with-us/lib';
import Badge from 'front-end/lib/views/badge';
import Link, { iconLinkSymbol, rightPlacement, routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { compareDates, formatDate } from 'shared/lib';
import * as CWUO from 'shared/lib/resources/opportunity/code-with-us';
import * as SWUO from 'shared/lib/resources/opportunity/sprint-with-us';
import { doesOrganizationMeetSWUQualification } from 'shared/lib/resources/organization';
import * as CWUP from 'shared/lib/resources/proposal/code-with-us';
import * as SWUP from 'shared/lib/resources/proposal/sprint-with-us';
import { isVendor, User } from 'shared/lib/resources/user';
import { adt, ADT, Defined } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

interface ValidState {
  table?: {
    title: string;
    link?: {
      text: string;
      route: Route;
    };
    headCells: Table.HeadCells;
    bodyRows: Table.BodyRows;
    state: Immutable<Table.State>;
  };
  viewerUser: User;
  isQualified?: boolean;
}

export type State = Validation<Immutable<ValidState>, null>;

type InnerMsg
  = ADT<'table', Table.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

function makeVendorBodyRows(cwu: CWUP.CWUProposalSlim[], swu: SWUP.SWUProposalSlim[], viewerUser: User): Table.BodyRows {
  return [
    ...(cwu.map(p => adt('cwu' as const, p))),
    ...(swu.map(p => adt('swu' as const, p)))
  ]
  .sort((a, b) => compareDates(a.value.createdAt, b.value.createdAt) * -1)
  .map(p => {
    return [
      {
        children: (<div>
          <Link dest={routeDest(adt(p.tag === 'cwu' ? 'proposalCWUEdit' : 'proposalSWUEdit', { proposalId: p.value.id, opportunityId: ''/*p.value.opportunity.id*/ }))}>
            {'title'/*p.value.opportunity.title*/}
          </Link>
          <div className='small text-secondary text-uppercase'>
            {p.tag === 'cwu' ? 'Code With Us' : 'Sprint With Us'}
          </div>
        </div>)
      },
      {
        children: (<Badge
          color={p.tag === 'cwu' ? cwuProposalStatusToColor(p.value.status, viewerUser.type) : swuProposalStatusToColor(p.value.status, viewerUser.type)}
          text={p.tag === 'cwu' ? cwuProposalStatusToTitleCase(p.value.status, viewerUser.type) : swuProposalStatusToTitleCase(p.value.status, viewerUser.type)} />)
      },
      {
        children: formatDate(p.value.createdAt)
      }
    ];
  });
}

function makePublicSectorBodyRows(cwu: CWUO.CWUOpportunitySlim[], swu: SWUO.SWUOpportunitySlim[], viewerUser: User): Table.BodyRows {
  return [
    ...(cwu.map(o => adt('cwu' as const, o))),
    ...(swu.map(o => adt('swu' as const, o)))
  ]
  .filter(o => o.value.createdBy?.id === viewerUser.id)
  .sort((a, b) => compareDates(a.value.createdAt, b.value.createdAt) * -1)
  .map(p => {
    const defaultTitle = p.tag === 'cwu'
      ? CWUO.DEFAULT_OPPORTUNITY_TITLE
      : SWUO.DEFAULT_OPPORTUNITY_TITLE;
    return [
      {
        children: (<div>
          <Link dest={routeDest(adt(p.tag === 'cwu' ? 'opportunityCWUEdit' : 'opportunitySWUEdit', { opportunityId: p.value.id }))}>
            {p.value.title || defaultTitle}
          </Link>
          <div className='small text-secondary text-uppercase'>
            {p.tag === 'cwu' ? 'Code With Us' : 'Sprint With Us'}
          </div>
        </div>)
      },
      {
        children: (<Badge
          color={p.tag === 'cwu' ? cwuOpportunityStatusToColor(p.value.status) : swuOpportunityStatusToColor(p.value.status)}
          text={p.tag === 'cwu' ? cwuOpportunityStatusToTitleCase(p.value.status) : swuOpportunityStatusToTitleCase(p.value.status)} />)
      },
      {
        children: formatDate(p.value.createdAt)
      }
    ];
  });
}

const init: PageInit<RouteParams, SharedState, State, Msg> = isSignedIn<RouteParams, State, Msg>({

  async success({ shared }) {
    const viewerUser = shared.sessionUser;
    const vendor = isVendor(viewerUser);
    const title = vendor ? 'My Proposals' : 'My Opportunities';
    const headCells: Table.HeadCells = [
      {
        children: vendor ? 'Opportunity' : 'Title',
        style: {
          width: '100%',
          minWidth: '240px'
        }
      },
      {
        children: 'Status',
        style: { width: '0px' }
      },
      {
        children: 'Date Created',
        className: 'text-nowrap',
        style: { width: '0px' }
      }
    ];
    let bodyRows: Table.BodyRows = [];
    let isQualified = false;
    if (vendor) {
      const cwu = api.getValidValue(await api.proposals.cwu.readMany(), []);
      const swu = api.getValidValue(await api.proposals.swu.readMany(), []);
      bodyRows = makeVendorBodyRows(cwu, swu, viewerUser);
      const orgs = api.getValidValue(await api.organizations.readMany(), []);
      isQualified = orgs.reduce((acc, o) => acc || doesOrganizationMeetSWUQualification(o), false as boolean);
    } else {
      const cwu = api.getValidValue(await api.opportunities.cwu.readMany(), []);
      const swu = api.getValidValue(await api.opportunities.swu.readMany(), []);
      bodyRows = makePublicSectorBodyRows(cwu, swu, viewerUser);
    }
    return valid(immutable({
      isQualified,
      viewerUser,
      table: bodyRows.length
        ? {
            title,
            headCells,
            bodyRows,
            state: immutable(await Table.init({
              idNamespace: 'dashboard-table'
            }))
          }
        : undefined
    }));
  },

  async fail({ dispatch }) {
    dispatch(replaceRoute(adt('landing' as const, null)));
    return invalid(null);
  }

});

const update: Update<State, Msg> = updateValid(({ state, msg }) => {
  switch (msg.tag) {
    case 'table':
      return updateComponentChild({
        state,
        childStatePath: ['table', 'state'],
        childUpdate: Table.update,
        childMsg: msg.value,
        mapChildMsg: value => ({ tag: 'table', value })
      });
    default:
      return [state];
  }
});

const Welcome: View<Pick<ValidState, 'viewerUser'>> = ({ viewerUser }) => {
  const vendor = isVendor(viewerUser);
  return (
    <div className='d-flex flex-column justify-content-center align-items-stretch flex-grow-1'>
      <Row className='justify-content-center text-center'>
        <Col xs='12' sm='10' md='6'>
          <img src={prefixPath('/images/sprint_with_us.svg')} className='mb-5 mb-md-6' />
          <h1 className='mb-4'>Welcome to the Digital Marketplace!</h1>
          <p>
            {vendor
              ? 'Get started by browsing the opportunities posted to the Digital Marketplace.'
              : 'Get started by creating your first opportunity or browsing the opportunities posted to the Digital Marketplace.'}
          </p>
          <div className='d-flex flex-column flex-sm-row flex-nowrap justify-content-center align-items-center mt-5'>
            <Link
              button
              dest={routeDest(adt('opportunities', null))}
              color={vendor ? 'primary' : 'info'}
              outline={!vendor}>
              View All Opportunities
            </Link>
            {!vendor
              ? (<Link
                  button
                  className='ml-sm-4 mt-3 mt-sm-0'
                  dest={routeDest(adt('opportunityCreate', null))}
                  color='primary'>
                  Create Your First Opportunity
                </Link>)
              : null}
          </div>
        </Col>
      </Row>
    </div>
  );
};

interface DashboardProps extends Pick<ValidState, 'viewerUser'> {
  table: Defined<ValidState['table']>;
  dispatch: Dispatch<Msg>;
}

const Dashboard: View<DashboardProps> = ({ table, viewerUser, dispatch }) => {
  return (
    <div>
      <Row className='mb-5'>
        <Col xs='12'>
          <h1 className='mb-0'>Dashboard</h1>
        </Col>
      </Row>
      <Row>
        <Col xs='12' md='9'>
          <div className='rounded-lg border bg-white p-3 p-sm-4'>
            <div className='d-flex flex-column flex-md-row align-items-start align-items-md-center mb-3'>
              <div className='font-weight-bold'>{table.title}</div>
              {table.link
                ? (<Link className='font-size-small' dest={routeDest(table.link.route)} iconSymbolSize={0.9} symbol_={rightPlacement(iconLinkSymbol('arrow-right'))}>
                    {table.link.text}
                  </Link>)
                : null}
            </div>
            <Table.view
              headCells={table.headCells}
              bodyRows={table.bodyRows}
              state={table.state}
              dispatch={mapComponentDispatch(dispatch, msg => adt('table' as const, msg))} />
          </div>
        </Col>
      </Row>
    </div>
  );
};

const view: ComponentView<State, Msg> = viewValid(({ state, dispatch }) => {
  if (state.table) {
    return (<Dashboard
      dispatch={dispatch}
      viewerUser={state.viewerUser}
      table={state.table} />);
  }
  return (<Welcome viewerUser={state.viewerUser} />);
});

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  backgroundColor: 'blue-light-alt-2',

  getMetadata() {
    return makePageMetadata('Dashboard');
  },

  getAlerts: getAlertsValid(state => {
    return {
      info: isVendor(state.viewerUser) && !state.isQualified
        ? [{
            text: (<span>You must <Link dest={routeDest(adt('orgCreate', null))}>create an organization</Link> and be a <Link dest={routeDest(adt('learnMoreSWU', null))}>Qualified Supplier</Link> in order to submit proposals to Sprint With Us opportunities.</span>)
          }]
        : []
    };
  })
};
