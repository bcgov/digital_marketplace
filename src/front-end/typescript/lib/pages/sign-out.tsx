import { makePageMetadata } from "front-end/lib";
import { Route, SharedState } from "front-end/lib/app/types";
import { component as component_ } from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import React from "react";
import { Col, Row } from "reactstrap";
import { CURRENT_SESSION_ID } from "shared/lib/resources/session";
import { ADT, adt } from "shared/lib/types";
import { Session } from "inspector";

export interface State {
  message: string;
}

export type InnerMsg = ADT<
  "onInitResponse",
  api.ResponseValidation<Session, string[]>
>;

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
    { message: "Signing out..." },
    [
      api.sessions.delete_<InnerMsg>()(
        CURRENT_SESSION_ID,
        (response) => adt("onInitResponse", response) as InnerMsg
      )
    ]
  ];
};

const update: component_.page.Update<State, InnerMsg, Route> = ({
  state,
  msg
}) => {
  switch (msg.tag) {
    case "onInitResponse":
      if (api.isValid(msg.value)) {
        return [
          state.set(
            "message",
            "You have successfully signed out. Thank you for using the Digital Marketplace."
          ),
          [component_.cmd.dispatch(component_.page.readyMsg())]
        ];
      } else {
        return [
          state.set("message", "Signing out of the application failed."),
          [component_.cmd.dispatch(component_.page.readyMsg())]
        ];
      }
    default:
      return [state, []];
  }
};

const view: component_.page.View<State, InnerMsg, Route> = ({ state }) => {
  return (
    <Row>
      <Col xs="12">{state.message}</Col>
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
    return makePageMetadata("Signed Out");
  }
};
