import { makePageMetadata } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as Table from 'front-end/lib/components/table';
import { replaceRoute } from 'front-end/lib/framework';
import { ComponentView, GlobalComponentMsg, immutable, Immutable, mapComponentDispatch, PageComponent, PageInit, Update, updateComponentChild } from 'front-end/lib/framework';
import { UserApi } from 'front-end/lib/http/api';
import * as UserHelpers from 'front-end/lib/pages/user/helpers';
import Icon from 'front-end/lib/views/icon';
import Link, { routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import * as UserModule from 'shared/lib/resources/user';
import { UserType } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';

export interface State {
  table: Immutable<Table.State>;
  users: UserModule.User[];
}

type InnerMsg = ADT<'table', Table.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

// Is user admin?
// Success: business as usual.
// Failure: redirect to not found page.
const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType({
  userType: [UserType.Admin],
  success: async ({ shared }) => {
    return {
      users: await UserApi.readMany(),
      table: immutable(await Table.init({
        idNamespace: 'user-list-table'
      }))
    };
  },

  fail: async ({ dispatch }) => {
    dispatch(replaceRoute(adt('notice' as const, adt('notFound' as const))));
    return {
      users: [],
      table: immutable(await Table.init({
        idNamespace: 'user-list-table'
      }))
    };
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
    { children: 'Status' },
    { children: 'Account Type' },
    { children: 'Name' },
    { children: 'Admin?' }
  ];
}

function tableBodyRows(state: Immutable<State>): Table.BodyRows {
  return state.users.map( fullUser => {
    const user = UserHelpers.toDisplayUser(fullUser);
    return [
      { children: <span className={`badge ${UserHelpers.getBadgeColor(user.active)}`}>{user.active ? 'Active' : 'Inactive'}</span> },
      { children: user.type },
      { children: <Link dest={routeDest( adt('userProfile', {userId: fullUser.id}) )}>{user.name}</Link> },
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
    return makePageMetadata('List Users');
  }
};
