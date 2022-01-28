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
import { AttachmentList } from 'front-end/lib/components/attachments';
// import { opportunityToHistoryItems } from 'front-end/lib/pages/opportunity/code-with-us/lib';

// const toasts = {
//   success: {
//     title: 'Note Published',
//     body: 'Your note has been successfully published.'
//   },
//   error: {
//     title: 'Unable to Publish Note',
//     body: 'Your note could not be published. Please try again later.'
//   }
// };

export interface Item {
  type: {
    text: string;
    color?: ThemeColor;
  };
  note?: string;
  attachments?: any; // brianna--change type later
  createdAt: Date;
  createdBy?: UserSlim;
}

export interface Params {
  idNamespace: string;
  items: Item[];
  viewerUser: User;
}

export interface State extends Pick<Params, 'items' | 'viewerUser'> {
  table: Immutable<Table.State>,
  publishNewNote?: any;
}

export type Msg = ADT<'table', Table.Msg>
| ADT<'createHistoryNote'>;

export const init: Init<Params, State> = async ({ idNamespace, items, viewerUser }) => {
  console.log('init is being called')
  //only updating db, not local state
  return {
    viewerUser,
    //brianna--probably need to put the note into the history?
    items, //items sorted in the http/api module.
    table: immutable(await Table.init({
      idNamespace
    }))
  };
};

export function getNewNote(state: Immutable<State>): string | null {
  //@ts-ignore--fix this function's types later
  return state.table ? state.table : null;
}

// const startPublishLoading = makeStartLoading<State>('publishLoading');
// const stopPublishLoading = makeStopLoading<State>('publishLoading');


const triggerInit = async (state) => {
  console.log('********state.history is',state.history)

  immutable(await init({
    idNamespace: 'cwu-opportunity-history', //fix later brianna
    items: state.history.items,
    viewerUser: state.viewerUser }));
}
export const update: Update<State, Msg> = ({ state, msg }) => {
  console.log('i am in update, msg is ',msg)
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
    case 'createHistoryNote':
      console.log('i am in in createHistoryNote ')
      triggerInit(state)

      return [
        // startPublishLoading(state).set('showModal', null),
        state,
        async (state, dispatch) => {
        //   state = stopPublishLoading(state);
          const newNote = getNewNote(state);
          if (!newNote) { return state; }
          //this is doing nothing, the actual note creation is in the other history
          const result = await state.publishNewNote(newNote);
          triggerInit(result)

          console.log('*****',result)
          // if (validation.isValid(result)) {
            console.log('i am in the if')
            // dispatch(toast(adt('success', toasts.success)));
            // return immutable(await init({
            //   idNamespace: 'cwu-opportunity-history', //fix later brianna
            //   items: state.items,
            //   viewerUser: state.viewerUser }));
          // } else {
            // dispatch(toast(adt('error', toasts.error)));
            // return state.update('newAddendum', s => s ? FormField.setErrors(s, result.value) : s);
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
        children: (
          <>
            {item.note || EMPTY_STRING}
            <AttachmentList files={item.attachments} />
          </>
        )
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
