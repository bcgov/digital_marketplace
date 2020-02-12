import * as Table from 'front-end/lib/components/table';
import { Component, ComponentView, Immutable, immutable, Init, mapComponentDispatch, Update, updateComponentChild } from 'front-end/lib/framework';
import { ThemeColor } from 'front-end/lib/types';
import Badge from 'front-end/lib/views/badge';
import Link, { routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { compareDates, formatDate, formatTime } from 'shared/lib';
import { User } from 'shared/lib/resources/user';
import { ADT, adt } from 'shared/lib/types';

export interface Item {
  type: {
    text: string;
    color?: ThemeColor;
  };
  note?: string;
  createdAt: Date;
  createdBy?: User;
}

export interface Params {
  idNamespace: string;
  items: Item[];
}

export interface State {
  items: Item[];
  table: Immutable<Table.State>;
}

export type Msg = ADT<'table', Table.Msg>;

export const init: Init<Params, State> = async ({ idNamespace, items }) => {
  return {
    items: items.sort((a, b) => compareDates(a.createdAt, b.createdAt) * -1),
    table: immutable(await Table.init({
      idNamespace
    }))
  };
};

export const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'table':
      return updateComponentChild({
        state,
        childStatePath: ['table'],
        childUpdate: Table.update,
        childMsg: msg.value,
        mapChildMsg: value => ({ tag: 'table', value })
      });
  }
};

function tableHeadCells(state: Immutable<State>): Table.HeadCells {
  return [
    {
      children: 'Entry Type',
      className: 'text-nowrap',
      style: { width: '20%' }
    },
    {
      children: 'Note',
      className: 'text-nowrap',
      style: {
        width: '55%',
        minWidth: '200px'
      }
    },
    {
      children: 'Created',
      className: 'text-nowrap',
      style: { width: '25%' }
    }
  ];
}

function tableBodyRows(state: Immutable<State>): Table.BodyRows {
  return state.items.map(item => {
    return [
      {
        children: item.type.color
          ? (<Badge
              text={item.type.text}
              color={item.type.color} />)
          : item.type.text,
        className: 'font-size-base text-nowrap'
      },
      {
        children: item.note || ''
      },
      {
        className: 'text-nowrap',
        children: (
          <div>
            <div>{formatDate(item.createdAt)}</div>
            <div>{formatTime(item.createdAt, true)}</div>
            {item.createdBy
              ? (<Link color='primary' className='text-uppercase small' dest={routeDest(adt('userProfile', { userId: item.createdBy.id }))}>{item.createdBy.name}</Link>)
              : (<div className='text-secondary text-uppercase small'>System</div>)}
          </div>
        )
      }
    ];
  });
}

export const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (
    <Table.view
      headCells={tableHeadCells(state)}
      bodyRows={tableBodyRows(state)}
      state={state.table}
      dispatch={mapComponentDispatch(dispatch, msg => adt('table' as const, msg))} />
  );
};

export const component: Component<Params, State, Msg> = {
  init,
  update,
  view
};

export default component;
