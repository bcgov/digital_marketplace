import { makePageMetadata } from 'front-end/lib';
import { Route, SharedState } from 'front-end/lib/app/types';
import * as Phases from 'front-end/lib/components/phases';
import * as TeamQuestions from 'front-end/lib/components/team-questions';
import { ComponentView, emptyPageAlerts, GlobalComponentMsg, Immutable, immutable, mapComponentDispatch, PageComponent, PageInit, toast, Update, updateComponentChild } from 'front-end/lib/framework';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { adt, ADT } from 'shared/lib/types';

export interface State {
  toast: [string, string];
  teamQs: Immutable<TeamQuestions.State>;
  phases: Immutable<Phases.State>;
}

type InnerMsg
  = ADT<'noop'>
  | ADT<'showToast'>
  | ADT<'updateTeamQs', TeamQuestions.Msg>
  | ADT<'updatePhases', Phases.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = async () => ({
  phases: immutable(await Phases.init({})),
  teamQs: immutable(await TeamQuestions.init({})),
  toast: [
    'Example Toast',
    'This is an example toast. This is an example toast. This is an example toast. This is an example toast.'
  ]
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
    case 'updateTeamQs':
      return updateComponentChild({
        state,
        childStatePath: ['teamQs'],
        childUpdate: TeamQuestions.update,
        childMsg: msg.value,
        mapChildMsg: value => ({ tag: 'updateTeamQs', value })
      });
    case 'showToast':
      return [
        state,
        async (state, dispatch) => {
          dispatch(toast(adt('info', {
            title: state.toast[0],
            body: state.toast[1]
          })));
          return null;
        }
      ];
    default:
      return [state];
  }
};

const view: ComponentView<State, Msg> = ({state, dispatch}) => {
  return (
    <Row>
      <Col xs='12'>
        Landing page coming soon.
      </Col>
      <Col xs='12' className='mt-5'>
        <button onClick={() => dispatch(adt('showToast'))}>Show Toast</button>
      </Col>
      <Col xs='12' md='8'>
        <TeamQuestions.view
          state={state.teamQs}
          dispatch={mapComponentDispatch(dispatch, msg => adt('updateTeamQs' as const, msg))} />
      </Col>
      <Col xs='12' md='8'>
        <Phases.view
          state={state.phases}
          dispatch={mapComponentDispatch(dispatch, msg => adt('updatePhases' as const, msg))}
          disabled={false}
        />
      </Col>
    </Row>
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
