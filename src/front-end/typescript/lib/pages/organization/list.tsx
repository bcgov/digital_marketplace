import { EMPTY_STRING } from 'front-end/config';
import { makePageMetadata, makeStartLoading, makeStopLoading } from 'front-end/lib';
import { pushState } from 'front-end/lib/app/router';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as Table from 'front-end/lib/components/table';
import { ComponentView, GlobalComponentMsg, immutable, Immutable, mapComponentDispatch, PageComponent, PageInit, Update, updateComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import Link, { iconLinkSymbol, leftPlacement, routeDest } from 'front-end/lib/views/link';
import Pagination from 'front-end/lib/views/pagination';
import React from 'react';
import { Col, Row } from 'reactstrap';
import Icon from 'front-end/lib/views/icon';
import { DEFAULT_PAGE_SIZE } from 'shared/config';
import { compareStrings } from 'shared/lib';
import { OrganizationSlim } from 'shared/lib/resources/organization';
import { isVendor, User, UserType } from 'shared/lib/resources/user';
import { ADT, adt } from 'shared/lib/types';
import { doesOrganizationMeetSWUQualification } from 'shared/lib/resources/organization';

type TableOrganization = OrganizationSlim;

export interface State {
  loading: number;
  table: Immutable<Table.State>;
  page: number;
  numPages: number;
  organizations: TableOrganization[];
  sessionUser: User | null;
}

type InnerMsg
  = ADT<'table', Table.Msg>
  | ADT<'pageChange', number>
  | ADT<'startLoading'>
  | ADT<'stopLoading'>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export interface RouteParams {
  page?: number;
}

function updateUrl(page: number) {
  pushState(adt('orgList', { page }));
}

async function baseState(): Promise<State> {
  return {
    loading: 0,
    page: 1,
    numPages: 5,
    organizations: [],
    table: immutable(await Table.init({
      idNamespace: 'org-list-table'
    })),
    sessionUser: null
  };
}

async function loadPage(page: number) {
  return await api.organizations.readMany(page, DEFAULT_PAGE_SIZE);
}

const init: PageInit<RouteParams, SharedState, State, Msg> = async ({ routeParams, shared }) => {
  const result = await loadPage(routeParams.page && routeParams.page > 0 ? routeParams.page : 1);
  if (!api.isValid(result)) {
    return await baseState();
  }
  const page = result.value.page;
  return {
    ...(await baseState()),
    sessionUser: shared.session && shared.session.user,
    page,
    numPages: result.value.numPages,
    organizations: result.value.items
      .sort((a, b) => compareStrings(a.legalName, b.legalName))
  };
};

const startLoading = makeStartLoading<State>('loading');
const stopLoading = makeStopLoading<State>('loading');

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
    case 'pageChange':
      return [
        startLoading(state),
        async state => {
          state = stopLoading(state);
          const result = await loadPage(msg.value);
          if (!api.isValid(result)) { return state; }
          const page = result.value.page;
          updateUrl(page);
          window.scrollTo(0, 0);
          return state.merge({
            page,
            numPages: result.value.numPages,
            organizations: result.value.items
          });
        }
      ];
    default:
      return [state];
  }
};

function showOwnerColumn(state: Immutable<State>): boolean {
  return !!state.sessionUser && state.sessionUser.type !== UserType.Government;
}

function tableHeadCells(state: Immutable<State>): Table.HeadCells {
  const owner = {
    children: 'Owner',
    className: 'text-nowrap',
    style: {
      minWidth: '200px'
    }
  };
  return [
    {
      children: 'Organization Name',
      className: 'text-nowrap',
      style: {
        width: '100%',
        minWidth: '240px'
      }
    },
    ...(showOwnerColumn(state) ? [owner] : []),
    {
      children: 'SWU Qualified?',
      className: 'text-nowrap',
      style: {
        width: '100%',
        minWidth: '240px'
      }
    },
  ];
}

export function tableBodyRows(state: Immutable<State>): Table.BodyRows {
  
  return state.organizations.map(org => {
    const owner = {
      className: 'text-nowrap',
      children: org.owner
        ? (<Link dest={routeDest(adt('userProfile', { userId: org.owner.id }))}>{org.owner.name}</Link>)
        : EMPTY_STRING
    };
    return [
      {
        children: org.owner
          ? (<Link dest={routeDest(adt('orgEdit', { orgId: org.id })) }>{org.legalName}</Link>)
          : org.legalName
      },
      ...(showOwnerColumn(state) ? [owner] : []),
      {
        children: (
          <Icon
            name={doesOrganizationMeetSWUQualification(org) ? 'check' : 'times'}
            color={doesOrganizationMeetSWUQualification(org) ? 'success' : 'body'} />
        )
      }
    ];
  });
}

const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  console.log('tableBodyRows(state)',tableBodyRows(state))
  const dispatchTable = mapComponentDispatch<Msg, Table.Msg>(dispatch, value => ({ tag: 'table', value }));
  return (
    <div>
      <h1 className='mb-5'>Digital Marketplace Organizations</h1>
      <Row>
        <Col xs='12'>
          <Table.view
            headCells={tableHeadCells(state)}
            bodyRows={tableBodyRows(state)}
            state={state.table}
            dispatch={dispatchTable} />
        </Col>
      </Row>
      {state.numPages === 1
        ? null
        : (<Row>
            <Col xs='12' className='mt-5 d-flex justify-content-center'>
              <Pagination
                page={state.page}
                numPages={state.numPages}
                disabled={state.loading > 0}
                onPageChange={page => dispatch(adt('pageChange', page))} />
            </Col>
          </Row>)}
    </div>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  getMetadata() {
    return makePageMetadata('Organizations');
  },
  getContextualActions: ({ state, dispatch }) => {
    if (!state.sessionUser || !isVendor(state.sessionUser)) { return null; }
    return adt('links', [
      {
        children: 'Create Organization',
        button: true,
        symbol_: leftPlacement(iconLinkSymbol('plus-circle')),
        color: 'primary',
        dest: routeDest(adt('orgCreate', null))
      },
      {
        children: 'My Organizations',
        button: true,
        outline: true,
        symbol_: leftPlacement(iconLinkSymbol('building')),
        color: 'c-nav-fg-alt',
        dest: routeDest(adt('userProfile', {
          userId: state.sessionUser.id,
          tab: 'organizations' as const
        }))
      },
      
    ]);
  }
};
