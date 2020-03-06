import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as Phases from 'front-end/lib/components/phases';
import { ComponentView, emptyPageAlerts, GlobalComponentMsg, immutable, Immutable, mapComponentDispatch, PageComponent, PageInit, Update, updateComponentChild } from 'front-end/lib/framework';
import React from 'react';
// import { Col, Row } from 'reactstrap';
import { adt, ADT } from 'shared/lib/types';

export interface State {
  phases: Immutable<Phases.State>;
}

type InnerMsg = ADT<'updatePhases', Phases.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = async () => ({
  phases: immutable(await Phases.init({}))
});

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'updatePhases':
      return updateComponentChild({
        state,
        childStatePath: ['phases'],
        childUpdate: Phases.update,
        childMsg: msg.value,
        mapChildMsg: value => ({ tag: 'updatePhases', value })
      });
    default:
      return [state];
  }
};

const view: ComponentView<State, Msg> = ({state, dispatch}) => {
  return (
    <Phases.view
      state={state.phases}
      dispatch={mapComponentDispatch(dispatch, msg => adt('updatePhases' as const, msg))}
    />
  );
};

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  getMetadata() {
    return makePageMetadata('Welcome');
  },
  getAlerts() {
    return {
      ...emptyPageAlerts(),
      info: [
        { text: 'first test alert' },
        { text: 'second test alert' }
      ],
      errors: [
        { text: 'first test alert' },
        { text: 'second test alert' }
      ]
    };
  },
  getBreadcrumbs() {
    return [
      { text: 'First' },
      { text: 'Second' }
    ];
  }
};
