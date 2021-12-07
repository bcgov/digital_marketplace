import { EMPTY_STRING } from 'front-end/typescript/config';
import { makePageMetadata } from 'front-end/typescript/lib';
import { isUserType } from 'front-end/typescript/lib/access-control';
import router from 'front-end/typescript/lib/app/router';
import { Route, SharedState } from 'front-end/typescript/lib/app/types';
import * as Table from 'front-end/typescript/lib/components/table';
import { replaceRoute } from 'front-end/typescript/lib/framework';
import { ComponentView, GlobalComponentMsg, immutable, Immutable, mapComponentDispatch, PageComponent, PageInit, Update, updateComponentChild } from 'front-end/typescript/lib/framework';
import * as api from 'front-end/typescript/lib/http/api';
import { userStatusToColor, userStatusToTitleCase, userTypeToTitleCase } from 'front-end/typescript/lib/pages/user/lib';
import Badge from 'front-end/typescript/lib/views/badge';
import Link, { routeDest } from 'front-end/typescript/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { compareStrings } from 'shared/lib';
import { isAdmin, User, UserType } from 'shared/lib/resources/user';
import { adt, ADT } from 'shared/lib/types';

interface TableUser extends User {
  statusTitleCase: string;
  typeTitleCase: string;
}

export interface State {
  table: Immutable<Table.State>;
  users: TableUser[];
}

type InnerMsg = ADT<'table', Table.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

async function baseState(): Promise<State> {
  return {
    users: [],
    table: immutable(await Table.init({
      idNamespace: 'user-list-table'
    }))
  };
}

const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType({
  userType: [UserType.Admin],
  async success({ shared }) {
    const result = await api.users.readMany();
    if (!api.isValid(result)) {
      return await baseState();
    }
    return {
      ...(await baseState()),
      users: result.value
        .map(user => ({
          ...user,
          typeTitleCase: userTypeToTitleCase(user.type),
          statusTitleCase: userStatusToTitleCase(user.status)
        }))
        .sort((a, b) => {
          const statusCompare = compareStrings(a.statusTitleCase, b.statusTitleCase);
          if (statusCompare) { return statusCompare; }
          const typeCompare = compareStrings(a.typeTitleCase, b.typeTitleCase);
          if (typeCompare) { return typeCompare; }
          return compareStrings(a.name, b.name);
        })
    };
  },
  async fail({ routePath, shared, dispatch }) {
    if (!shared.session) {
      dispatch(replaceRoute(adt('signIn' as const, {
        redirectOnSuccess: router.routeToUrl(adt('userList', null))
      })));
    } else {
      dispatch(replaceRoute(adt('notFound' as const, { path: routePath })));
    }
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
      children: 'Status',
      className: 'text-nowrap',
      style: { width: '0px' }
    },
    {
      children: 'Account Type',
      className: 'text-nowrap',
      style: { width: '0px' }
    },
    {
      children: 'Name',
      className: 'text-nowrap',
      style: {
        width: '100%',
        minWidth: '200px'
      }
    },
    {
      children: 'Admin?',
      className: 'text-center text-nowrap',
      style: { width: '0px' }
    }
  ];
}

function tableBodyRows(state: Immutable<State>): Table.BodyRows {
  return state.users.map(user => {
    return [
      {
        children: (
          <Badge
            text={user.statusTitleCase}
            color={userStatusToColor(user.status)} />
        )
      },
      {
        children: user.typeTitleCase,
        className: 'text-nowrap'
      },
      {
        children: (<Link dest={routeDest( adt('userProfile', { userId: user.id }) )}>{user.name || EMPTY_STRING}</Link>)
      },
      {
        children: (<Table.Check checked={isAdmin(user)} />),
        className: 'text-center'
      }
    ];
  });
}

const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  const dispatchTable = mapComponentDispatch<Msg, Table.Msg>(dispatch, value => ({ tag: 'table', value }));
  return (
    <Row>
      <Col xs='12'>
        <h1 className='mb-5'>Digital Marketplace Users</h1>
        <Table.view
          headCells={tableHeadCells(state)}
          bodyRows={tableBodyRows(state)}
          state={state.table}
          dispatch={dispatchTable} />
      </Col>
    </Row>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  getMetadata() {
    return makePageMetadata('Users');
  }
};
