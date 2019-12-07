import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as ShortText from 'front-end/lib/components/form-field/short-text';
import * as Table from 'front-end/lib/components/table';
import { ComponentView, emptyPageAlerts, GlobalComponentMsg, immutable, Immutable, mapComponentDispatch, PageAlert, PageComponent, PageInit, Update, updateComponentChild } from 'front-end/lib/framework';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { ADT } from 'shared/lib/types';
import { invalid } from 'shared/lib/validation';

export interface State {
  infoAlerts: Array<PageAlert<Msg>>;
  table: Immutable<Table.State>;
  shortText: Immutable<ShortText.State>;
}

type InnerMsg
  = ADT<'noop'>
  | ADT<'dismissInfoAlert', number>
  | ADT<'table', Table.Msg>
  | ADT<'shortText', ShortText.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = async () => ({
  infoAlerts: [
    { text: 'LOREM ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.' },
    { text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.', dismissMsg: { tag: 'dismissInfoAlert', value: 1 } }
  ],
  landing: '',
  table: immutable(await Table.init({
    idNamespace: 'test-table'
  })),
  shortText: immutable(await ShortText.init({
    errors: [],
    validate: v => invalid(['foo bar']),
    child: {
      value: '',
      id: 'landing-short-text',
      type: 'text'
    }
  }))
});

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'dismissInfoAlert':
      const foo = state.update('infoAlerts', alerts => alerts.filter((a, i) => {
        return i !== msg.value;
      }));
      //tslint:disable
      console.log(foo);
      return [
        state.update('infoAlerts', alerts => alerts.filter((a, i) => {
          return i !== msg.value;
        }))
      ];
    case 'table':
      return updateComponentChild({
        state,
        childStatePath: ['table'],
        childUpdate: Table.update,
        childMsg: msg.value,
        mapChildMsg: value => ({ tag: 'table', value })
      });
    case 'shortText':
      return updateComponentChild({
        state,
        childStatePath: ['shortText'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: value => ({ tag: 'shortText', value })
      });
    default:
      return [state];
  }
};

function tableHeadCells(state: Immutable<State>): Table.HeadCells {
  return [
    { children: 'One' },
    { children: 'Two' }
  ];
}

function tableBodyRows(state: Immutable<State>): Table.BodyRows {
  return [
    [
      { children: 'no tooltip' },
      { children: 'yes tooltip', tooltipText: 'Foo' }
    ],
    [
      { children: 'no tooltip' },
      { children: 'yes tooltip', tooltipText: 'Foo' }
    ]
  ];
}

const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  const dispatchTable = mapComponentDispatch<Msg, Table.Msg>(dispatch, value => ({ tag: 'table', value }));
  const dispatchShortText = mapComponentDispatch<Msg, ShortText.Msg>(dispatch, value => ({ tag: 'shortText', value }));
  return (
    <div>
      <Row className='mb-3 pb-3'>
        <Col xs='12'>
          Landing, world.
        </Col>
      </Row>
      <Row className='mb-3 pb-3'>
        <Col xs='12'>
          <Table.view
            headCells={tableHeadCells(state)}
            bodyRows={tableBodyRows(state)}
            state={state.table}
            dispatch={dispatchTable} />
        </Col>
      </Row>
      <Row className='mb-3 pb-3'>
        <Col xs='12'>
          <ShortText.view
            label='A short text field'
            help='This is help text'
            required
            state={state.shortText}
            dispatch={dispatchShortText} />
        </Col>
      </Row>
    </div>
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  getAlerts(state) {
    return {
      ...emptyPageAlerts(),
      info: state.infoAlerts
    };
  },
  getMetadata() {
    return makePageMetadata('Hello, World');
  }
};
