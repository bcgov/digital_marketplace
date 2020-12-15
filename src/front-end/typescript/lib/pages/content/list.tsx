import { getContextualActionsValid, makePageMetadata, updateValid, ValidatedState, viewValid } from 'front-end/lib';
import { isUserType } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as Table from 'front-end/lib/components/table';
import { ComponentView, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, PageComponent, PageInit, replaceRoute, Update, updateComponentChild } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import * as Form from 'front-end/lib/pages/content/lib/components/form';
import Link, { iconLinkSymbol, leftPlacement, rightPlacement, routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { compareStrings, formatDate } from 'shared/lib';
import { Content } from 'shared/lib/resources/content';
import { UserType } from 'shared/lib/resources/user';
import { ADT, adt } from 'shared/lib/types';
import { invalid, valid } from 'shared/lib/validation';

interface TableContent extends Content {
  slugPath: string;
}

interface ValidState {
  table: Immutable<Table.State>;
  content: TableContent[];
}

export type State = ValidatedState<ValidState>;

type InnerMsg
  = ADT<'table', Table.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

export const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType<RouteParams, State, Msg>({
  userType: [UserType.Admin],
  async success({ routeParams, shared }) {
    let content: TableContent[] = [];
    const result = await api.content.readMany();
    if (api.isValid(result)) {
      content = result.value
        .map(c => ({
          ...c,
          slugPath: Form.slugPath(c.slug)
        }))
        .sort((a, b) => compareStrings(a.title, b.title));
    }
    return valid(immutable({
      content,
      table: immutable(await Table.init({
        idNamespace: 'content-list'
      }))
    }));
  },
  async fail({ dispatch, routePath }) {
    dispatch(replaceRoute(adt('notFound' as const, {
      path: routePath
    })));
    return invalid(null);
  }
});

export const update: Update<State, Msg> = updateValid(({ state, msg }) => {
  switch (msg.tag) {
    case 'table':
      return updateComponentChild({
        state,
        childStatePath: ['table'],
        childUpdate: Table.update,
        childMsg: msg.value,
        mapChildMsg: value => adt('table', value)
      });
    default:
      return [state];
  }
});

function tableHeadCells(state: Immutable<ValidState>): Table.HeadCells {
  return [
    {
      children: 'Title',
      className: 'text-nowrap',
      style: {
        width: '100%',
        minWidth: '200px'
      }
    },
    {
      children: 'Updated',
      className: 'text-nowrap',
      style: { width: '0px' }
    },
    {
      children: 'Created',
      className: 'text-nowrap',
      style: { width: '0px' }
    }
  ];
}

function tableBodyRows(state: Immutable<ValidState>): Table.BodyRows {
  return state.content.map(c => {
    return [
      {
        children: (
          <div>
            <Link dest={routeDest(adt('contentEdit', c.slug))}>{c.title}</Link>
            <br />
            <Link className='small text-uppercase' color='secondary' newTab dest={routeDest(adt('contentView', c.slug))} iconSymbolSize={0.75} symbol_={rightPlacement(iconLinkSymbol('external-link'))}>{c.slugPath}</Link>
          </div>
        )
      },
      {
        className: 'text-nowrap',
        children: formatDate(c.updatedAt)
      },
      {
        className: 'text-nowrap',
        children: formatDate(c.createdAt)
      }
    ];
  });
}

export const view: ComponentView<State, Msg> = viewValid(({ state, dispatch }) => {
  return (
    <div>
      <Row>
        <Col xs='12'>
          <h1 className='mb-5'>Content Manager</h1>
          <h2 className='mb-4'>Pages</h2>
          <Table.view
            headCells={tableHeadCells(state)}
            bodyRows={tableBodyRows(state)}
            state={state.table}
            dispatch={mapComponentDispatch(dispatch, msg => adt('table' as const, msg))} />
        </Col>
      </Row>
    </div>
  );
});

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  getMetadata() {
    return makePageMetadata('Content');
  },
  getContextualActions: getContextualActionsValid(({ state, dispatch }) => {
    return adt('links', [
      {
        children: 'Create Page',
        button: true,
        symbol_: leftPlacement(iconLinkSymbol('file-plus')),
        color: 'primary',
        dest: routeDest(adt('contentCreate', null))
      }
    ]);
  })
};
