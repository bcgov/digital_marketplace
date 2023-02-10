import { component } from "front-end/lib/framework";
import { ADT } from "shared/lib/types";
import React from "react";
import { SharedState, Route } from "learn-front-end/solutions/06-pages/types";

export interface RouteParams {
  name: string;
}

export interface State {
  name: string;
}

export type InnerMsg = ADT<"noop">;

export type Msg = component.page.Msg<InnerMsg, Route>;

const DEFAULT_NAME = "world";

export const init: component.page.Init<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = ({ routeParams }) => [{ name: routeParams.name || DEFAULT_NAME }, []];

export const update: component.page.Update<State, InnerMsg, Route> = ({
  state
}) => {
  return [state, []];
};

export const view: component.page.View<State, InnerMsg, Route> = ({
  state
}) => {
  return <div>{helloMessage(state.name)}</div>;
};

export const page: component.page.Component<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = {
  init,
  update,
  view,
  getMetadata(state) {
    return {
      title: helloMessage(state.name)
    };
  }
};

function helloMessage(name: string): string {
  return `Hello, ${name}!`;
}
