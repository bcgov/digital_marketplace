import { makePageMetadata } from 'front-end/lib';
import { isSignedIn } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as Table from 'front-end/lib/components/table';
import { ComponentView, GlobalComponentMsg, immutable, Immutable, mapComponentDispatch, PageComponent, PageInit, replaceRoute, Update, updateComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import Link, { routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { OrganizationSlim } from 'shared/lib/resources/organization';
import { ADT, adt } from 'shared/lib/types';

type TableOrganization = OrganizationSlim;

export interface State {
  table: Immutable<Table.State>;
  organizations: TableOrganization[];
}

type InnerMsg = ADT<'table', Table.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

async function baseState(): Promise<State> {
  return {
    organizations: [],
    table: immutable(await Table.init({
      idNamespace: 'org-list-table'
    }))
  };
}

const init: PageInit<RouteParams, SharedState, State, Msg> = isSignedIn({
  async success({ shared }) {
    const result = await api.organizations.readMany();
    if (!api.isValid(result)) {
      return await baseState();
    }
    return {
      ...(await baseState()),
      organizations: result.value
        .sort((a, b) => a.legalName.localeCompare(b.legalName))
    };
  },
  async fail({ dispatch }) {
    dispatch(replaceRoute(adt('notice' as const, adt('notFound' as const))));
    return await baseState();
  }
});

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

function tableHeadCells(state: Immutable<State>): Table.HeadCells {
  return [
    {
      children: 'Organization Name',
      style: {
        width: '60%',
        minWidth: '240px'
      }
    },
    {
      children: 'Owner',
      style: {
        width: '40%',
        minWidth: '200px'
      }
    }
  ];
}

function tableBodyRows(state: Immutable<State>): Table.BodyRows {
  return state.organizations.map(org => {
    return [
      { children: <Link dest={routeDest(adt('orgEdit', { orgId: org.id})) }>{org.legalName}</Link> },
      {
        children: org.owner
        ? (<Link dest={routeDest(adt('userProfile', { userId: org.owner.id }))}>{org.owner.name}</Link>)
          : null
      }
    ];
  });
}

const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
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
    </div>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  getMetadata() {
    return makePageMetadata('Organizations');
  }
};
