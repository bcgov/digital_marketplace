import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as Table from 'front-end/lib/components/table';
import { ComponentView, GlobalComponentMsg, immutable, Immutable, mapComponentDispatch, PageComponent, PageInit, Update, updateComponentChild } from 'front-end/lib/framework';
import Icon from 'front-end/lib/views/icon';
import React from 'react';
import { Col, Row } from 'reactstrap';
import * as UserModule from 'shared/lib/resources/user';
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
    { children: 'Status' },
    { children: 'Account Type' },
    { children: 'Name' },
    { children: 'Admin?' }
  ];
}

type UserType = 'Public Sector Employee' | 'Vendor';

interface DisplayUser {
  name: string;
  type: UserType;
  active: boolean;
  admin: boolean;
}

function mapUserTypeToDisplayType(users: UserModule.User[]): DisplayUser[] {
  return users.map( (user) => {
    return ({
      name: user.name,
      type: user.type === UserModule.UserType.Vendor ? 'Vendor' : 'Public Sector Employee',
      admin: user.type === UserModule.UserType.Admin ? true : false,
      active: user.status === UserModule.UserStatus.Active ? true : false
    });
  });
}

function getBadgeColor(isActive: boolean): string {
  return isActive ? 'badge-success' : 'badge-danger';
}

function tableBodyRows(state: Immutable<State>): Table.BodyRows {
  return mapUserTypeToDisplayType(UserModule.getAllUsers()).map( (user) => {
    return [
      { children: <span className={`badge ${getBadgeColor(user.active)}`}>{user.active ? 'Active' : 'Inactive'}</span> },
      { children: user.type },
      { children: user.name },
      { children: user.admin ? <Icon name='check' /> : null }
    ];
  });
}

const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  const dispatchTable = mapComponentDispatch<Msg, Table.Msg>(dispatch, value => ({ tag: 'table', value }));
  return (
    <div>
      <h1 className='pb-5'>Digital Marketplace Users</h1>
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
