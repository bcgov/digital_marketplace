import { makePageMetadata } from "front-end/lib";
import { Route, SharedState } from "front-end/lib/app/types";
import { component as component_ } from "front-end/lib/framework";
import React from "react";
import { Col, Row } from "reactstrap";
import { ADT } from "shared/lib/types";

export interface State {
  empty: true;
}

export type InnerMsg = ADT<"noop">;

export type Msg = component_.page.Msg<InnerMsg, Route>;

export type RouteParams = null;

const init: component_.page.Init<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = () => {
  return [
    { empty: true },
    [component_.cmd.dispatch(component_.page.readyMsg())]
  ];
};

const update: component_.page.Update<State, InnerMsg, Route> = ({ state }) => {
  return [state, []];
};

const view: component_.page.View<State, InnerMsg, Route> = () => {
  return (
    <Row>
      <Col xs="12">Proposal List</Col>
    </Row>
  );
};

export const component: component_.page.Component<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = {
  init,
  update,
  view,
  getMetadata() {
    return makePageMetadata("Proposals");
  }
};
