import * as ShortText from 'front-end/lib/components/form-field/short-text';
import { EMPTY_STRING } from 'front-end/config';
import * as Table from 'front-end/lib/components/table';
import { Component, ComponentView, Immutable, immutable, Init, mapComponentDispatch, Update, updateComponentChild } from 'front-end/lib/framework';
import { ThemeColor } from 'front-end/lib/types';
import Badge from 'front-end/lib/views/badge';
import Link, { routeDest } from 'front-end/lib/views/link';
import React from 'react';
import { formatDate, formatTime } from 'shared/lib';
import { isAdmin, User, UserSlim } from 'shared/lib/resources/user';
import { ADT, adt } from 'shared/lib/types';
// import * as validation from 'shared/lib/validation';
// import { makeStartLoading, makeStopLoading } from 'front-end/lib';


export interface Item {
  type: {
    text: string;
    color?: ThemeColor;
  };
  note?: string;
  createdAt: Date;
  createdBy?: UserSlim;
}
// another interface for createnewnote, nest the attachment and note
export interface ModalNote {
  modalNote: Immutable<ShortText.State>;
}

export interface Params {
  idNamespace: string;
  items: Item[];
  viewerUser: User;
  // modalNote: string; //fix later^^ see above comment
}

export interface State extends Pick<Params, 'items' | 'viewerUser'> {
  table: Immutable<Table.State>,
  briannaPublishNewNote?: any;
}

export type Msg = ADT<'table', Table.Msg>
| ADT<'publishNote'>

export const init: Init<Params, State> = async ({ idNamespace, items, viewerUser }) => {
  return {
    viewerUser,
    // modalNote:'',
    items, //items sorted in the http/api module.
    table: immutable(await Table.init({
      idNamespace
    }))
  };
};

export function getNewNote(state: Immutable<State>): string | null {
  //how are we going to get the modalNote into this state in this file? brianna
  //@ts-ignore--fix this function's types later
  return state.table ? state.table : null;
}

// const startPublishLoading = makeStartLoading<State>('publishLoading');
// const stopPublishLoading = makeStopLoading<State>('publishLoading');

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
      //brianna new
      case 'publishNote':
        return [
          // startPublishLoading(state).set('showModal', null),
          state,
          async (state, dispatch) => {
          //   state = stopPublishLoading(state);
            const newNote = getNewNote(state);
            if (!newNote) { return state; }
            const result = await state.briannaPublishNewNote(newNote);
            console.log(result)
            // if (validation.isValid(result)) {
            //   dispatch(toast(adt('success', toasts.success)));
            //   return immutable(await init({
            //     publishNewAddendum: state.publishNewAddendum,
            //     existingAddenda: result.value
            //   }));
            // } else {
            //   dispatch(toast(adt('error', toasts.error)));
            //   return state.update('newAddendum', s => s ? FormField.setErrors(s, result.value) : s);
            // }
            return null
          }
        ];
  }
};

function tableHeadCells(state: Immutable<State>): Table.HeadCells {
  return [
    {
      children: 'Entry Type',
      className: 'text-nowrap',
      style: {
        width: '0px',
        minWidth: '150px'
      }
    },
    {
      children: 'Note',
      className: 'text-nowrap',
      style: {
        width: '100%',
        minWidth: '200px'
      }
    },
    {
      children: 'Created',
      className: 'text-nowrap',
      style: { width: '0px' }
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
        className: 'text-wrap'
      },
      {
        children: item.note || EMPTY_STRING
      },
      {
        className: 'text-nowrap',
        children: (
          <div>
            <div>{formatDate(item.createdAt)}</div>
            <div>{formatTime(item.createdAt, true)}</div>
            {(() => {
              if (!item.createdBy) {
                return (<div className='text-secondary text-uppercase small'>System</div>);
              }
              if (isAdmin(state.viewerUser)) {
                return (<Link className='text-uppercase small' dest={routeDest(adt('userProfile', { userId: item.createdBy.id }))}>{item.createdBy.name}</Link>);
              }
              return (<div className='text-secondary text-uppercase small'>{item.createdBy.name}</div>);
            })()}
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
