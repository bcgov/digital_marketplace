import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as Table from 'front-end/lib/components/table';
import { ComponentView, GlobalComponentMsg, immutable, Immutable, mapComponentDispatch, PageComponent, PageInit, Update, updateComponentChild } from 'front-end/lib/framework';
import React from 'react';
import { Col, Row } from 'reactstrap';
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
    { children: 'Organization Name' },
    { children: 'Owner' }
  ];
}

interface Organization {
  name: string;
  ownerId: number;
}

function getAllOrgs(): Organization[] {
  return [
    {
      name: 'Org1',
      ownerId: 1
    },
    {
      name: 'Org2',
      ownerId: 2
    },
    {
      name: 'Org3',
      ownerId: 3
    },
    {
      name: 'Org4',
      ownerId: 4
    }
  ];
}

function getOwner( ownerId: number ): string {
  return 'owner name';
}

function tableBodyRows(state: Immutable<State>): Table.BodyRows {
  return getAllOrgs().map( (org) => {
    return [
      { children: org.name },
      { children: getOwner(org.ownerId) }
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
    return makePageMetadata('Organization List');
  }
};
