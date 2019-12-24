import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as Table from 'front-end/lib/components/table';
import { ComponentView, GlobalComponentMsg, immutable, Immutable, mapComponentDispatch, PageComponent, PageInit, Update, updateComponentChild } from 'front-end/lib/framework';
import * as HTTP from 'front-end/lib/http/api';
import Link, { routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { Organization } from 'shared/lib/resources/organization';
import { ADT, adt } from 'shared/lib/types';

export interface State {
  table: Immutable<Table.State>;
  organizations: Organization[];
}

type InnerMsg = ADT<'table', Table.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = async () => ({
  table: immutable(await Table.init({
    idNamespace: 'org-list-table'
  })),
  organizations: await HTTP.OrgApi.readMany()
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
        width: '60%'
      }
    },
    {
      children: 'Owner',
      style: {
        width: '40%'
      }
    }
  ];
}

function tableBodyRows(state: Immutable<State>): Table.BodyRows {
  return state.organizations.map( (org) => {
    return [
      { children: <Link dest={routeDest(adt('orgEdit', { orgId: org.id})) }>{org.legalName}</Link> },
      { children: org.contactName ? org.contactName : null }
    ];
  });
}

const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  const dispatchTable = mapComponentDispatch<Msg, Table.Msg>(dispatch, value => ({ tag: 'table', value }));
  return (
    <div>
      <h1 className='pb-5'>Digital Marketplace Organizations</h1>
      <Row className='mb-3 pb-3'>
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
    return makePageMetadata('List Organizations');
  }
};
