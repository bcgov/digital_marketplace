import { isUserType } from 'front-end/lib/access-control';
import { Route, SharedState } from 'front-end/lib/app/types';
import { ComponentView, GlobalComponentMsg, immutable, PageInit, replaceRoute, Update } from 'front-end/lib/framework';
import React from 'react';
import { UserType } from 'shared/lib/resources/user';
import { adt } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

interface ValidState {
  empty: true;
}

export type State = Validation<ValidState, null>;

type InnerMsg = null;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

export const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType<RouteParams, State, Msg>({
  userType: [UserType.Admin],
  async success({ routeParams, shared }) {
    return immutable(valid({
      empty: true
    }));
  },
  async fail({ dispatch, routePath }) {
    dispatch(replaceRoute(adt('notFound' as const, {
      path: routePath
    })));
    return immutable(invalid(null));
  }
});

export const update: Update<State, Msg> = ({ state, msg }) => {
  return [state];
};

export const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
  return (<div></div>);
};
