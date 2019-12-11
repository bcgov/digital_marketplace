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
    idNamespace: 'user-list-table'
  })),
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
    { children: 'Status' },
    { children: 'Account Type' },
    { children: 'Name' },
    { children: 'Admin?' },
  ];
}


function tableBodyRows(state: Immutable<State>): Table.BodyRows {
  return [
    [
      { children: 'status' },
      { children: 'type' },
      { children: 'name' },
      { children: 'admin' },
    ],
    [
      { children: 'status' },
      { children: 'type' },
      { children: 'name' },
      { children: 'admin' },
    ],
    [
      { children: 'status' },
      { children: 'type' },
      { children: 'name' },
      { children: 'admin' },
    ],
  ];
}

const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  const dispatchTable = mapComponentDispatch<Msg, Table.Msg>(dispatch, value => ({ tag: 'table', value }));
  return (
    <div>
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
    return makePageMetadata('User List');
  }
};
