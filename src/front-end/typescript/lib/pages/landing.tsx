import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as TeamQuestions from 'front-end/lib/components/team-questions';
import { ComponentView, emptyPageAlerts, GlobalComponentMsg, immutable, Immutable, mapComponentDispatch, PageComponent, PageInit, Update, updateComponentChild } from 'front-end/lib/framework';
import React from 'react';
// import { Col, Row } from 'reactstrap';
import { adt, ADT } from 'shared/lib/types';

export interface State {
  teamQs: Immutable<TeamQuestions.State>;
}

type InnerMsg = ADT<'updateTeamQs', TeamQuestions.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = async () => ({
  teamQs: immutable(await TeamQuestions.init({}))
});

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'updateTeamQs':
      return updateComponentChild({
        state,
        childStatePath: ['teamQs'],
        childUpdate: TeamQuestions.update,
        childMsg: msg.value,
        mapChildMsg: value => ({ tag: 'updateTeamQs', value })
      });
    default:
      return [state];
  }
};

const view: ComponentView<State, Msg> = ({state, dispatch}) => {
  return (
    <TeamQuestions.view
      state={state.teamQs}
      dispatch={mapComponentDispatch(dispatch, msg => adt('updateTeamQs' as const, msg))}
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
