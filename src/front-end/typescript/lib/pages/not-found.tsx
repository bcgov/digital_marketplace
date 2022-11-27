import { makePageMetadata } from "front-end/lib";
import { Route, SharedState } from "front-end/lib/app/types";
import { component as component_ } from "front-end/lib/framework";
import Link, { routeDest } from "front-end/lib/views/link";
import React from "react";
import { Col, Row } from "reactstrap";
import { adt, ADT } from "shared/lib/types";

export interface RouteParams {
  path?: string;
}

export type State = RouteParams;

export type InnerMsg = ADT<"noop">;

export type Msg = component_.page.Msg<InnerMsg, Route>;

const init: component_.page.Init<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = ({ routeParams }) => [
  routeParams,
  [component_.cmd.dispatch(component_.page.readyMsg())]
];

const update: component_.page.Update<State, InnerMsg, Route> = ({ state }) => {
  return [state, []];
};

const view: component_.page.View<State, InnerMsg, Route> = () => {
  return (
    <div>
      <Row className="mb-3">
        <Col xs="12">
          <h1>Not Found</h1>
        </Col>
      </Row>
      <Row className="mb-3 pb-3">
        <Col xs="12">
          <p>The page you are looking for doesn{"'"}t exist.</p>
        </Col>
      </Row>
      <Row>
        <Col xs="12">
          <Link dest={routeDest(adt("landing", null))} button color="primary">
            Go Home
          </Link>
        </Col>
      </Row>
    </div>
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
    return makePageMetadata("Not Found");
  }
};
