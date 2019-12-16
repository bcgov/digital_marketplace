import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as Table from 'front-end/lib/components/table';
import { ComponentView, GlobalComponentMsg, immutable, Immutable, mapComponentDispatch, PageComponent, PageInit, Update, updateComponentChild } from 'front-end/lib/framework';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { OrganizationSlim } from 'shared/lib/resources/organization';
import { ADT } from 'shared/lib/types';

export interface State {
  table: Immutable<Table.State>;
}

type InnerMsg = ADT<'table', Table.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = async () => ({
  table: immutable(await Table.init({
    idNamespace: 'org-list-table'
  }))
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

function getAllOrgs(): OrganizationSlim[] {
  return [
    {
      id: '1',
      legalName: 'Org1',
      owner: {
        id: '1',
        name: 'Org Owner Nmae'
      }
    },
    {
      id: '2',
      legalName: 'Org2',
      owner: {
        id: '1',
        name: 'Org Owner Nmae'
      }
    },
    {
      id: '3',
      legalName: 'Org3',
      owner: {
        id: '1',
        name: 'Org Owner Nmae'
      }
    },
    {
      id: '4',
      legalName: 'Org4',
      owner: {
        id: '1',
        name: 'Org Owner Nmae'
      }
    },
    {
      id: '5',
      legalName: 'Org5',
      owner: {
        id: '1',
        name: 'Org Owner Nmae'
      }
    }
  ];
}

function tableBodyRows(state: Immutable<State>): Table.BodyRows {
  return getAllOrgs().map( (org) => {
    return [
      { children: org.legalName },
      { children: org.owner ? org.owner.name : null }
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
