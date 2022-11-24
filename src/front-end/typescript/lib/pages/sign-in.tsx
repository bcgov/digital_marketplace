import { makePageMetadata, sidebarValid, viewValid } from "front-end/lib";
import { isSignedOut } from "front-end/lib/access-control";
import { Route, SharedState } from "front-end/lib/app/types";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import Link, { routeDest } from "front-end/lib/views/link";
import makeInstructionalSidebar from "front-end/lib/views/sidebar/instructional";
import { SignInCard } from "front-end/lib/views/sign-in-card";
import React from "react";
import { Col, Row } from "reactstrap";
import { GOV_IDP_NAME, VENDOR_IDP_NAME } from "shared/config";
import { UserType } from "shared/lib/resources/user";
import { ADT, adt } from "shared/lib/types";
import { invalid, valid, Validation } from "shared/lib/validation";

interface ValidState {
  redirectOnSuccess?: string;
}

export type State = Validation<Immutable<ValidState>, null>;

export type InnerMsg = ADT<"noop">;

export type Msg = component_.page.Msg<InnerMsg, Route>;

export type RouteParams = ValidState;

const init: component_.page.Init<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = isSignedOut<RouteParams, State, Msg>({
  success({ routeParams }) {
    return [
      valid(immutable(routeParams)),
      [component_.cmd.dispatch(component_.page.readyMsg())]
    ];
  },
  fail({ routeParams }) {
    return [
      invalid(null),
      [
        component_.cmd.dispatch(
          routeParams.redirectOnSuccess
            ? component_.global.replaceUrlMsg(routeParams.redirectOnSuccess)
            : component_.global.replaceRouteMsg(adt("dashboard" as const, null))
        )
      ]
    ];
  }
});

const update: component_.page.Update<State, InnerMsg, Route> = ({ state }) => {
  return [state, []];
};

const view: component_.page.View<State, InnerMsg, Route> = viewValid(
  ({ state }) => {
    return (
      <div>
        <Row className="pb-4">
          <Col xs="12" className="mx-auto">
            <h2>Sign In</h2>
            <p>
              Select one of the options available below to sign in to your
              Digital Marketplace account.
            </p>
          </Col>
        </Row>
        <SignInCard
          userType={UserType.Vendor}
          title="Vendor"
          description={`Use your ${VENDOR_IDP_NAME} account to sign in to the Digital Marketplace.`}
          redirectOnSuccess={state.redirectOnSuccess}
          buttonText={`Sign In Using ${VENDOR_IDP_NAME}`}
        />
        <SignInCard
          userType={UserType.Government}
          redirectOnSuccess={state.redirectOnSuccess}
          title="Public Sector Employee"
          description={`Use your ${GOV_IDP_NAME} to sign in to the Digital Marketplace.`}
          buttonText={`Sign In Using ${GOV_IDP_NAME}`}
        />
      </div>
    );
  }
);

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
  sidebar: sidebarValid({
    size: "large",
    color: "c-sidebar-instructional-bg",
    view: makeInstructionalSidebar<ValidState, Msg>({
      getTitle: () => "Welcome Back to the Digital Marketplace",
      getDescription: () =>
        "Please sign in to access your Digital Marketplace account.",
      getFooter: ({ state }) => (
        <span>
          Don{"'"}t have an account?&nbsp;
          <Link
            dest={routeDest(
              adt("signUpStepOne", {
                redirectOnSuccess: state.redirectOnSuccess
              })
            )}>
            Sign up
          </Link>
          .
        </span>
      )
    })
  }),
  getMetadata() {
    return makePageMetadata("Sign In");
  }
};
