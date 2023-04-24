import { makePageMetadata, prefixPath } from "front-end/lib";
import { isUserType } from "front-end/lib/access-control";
import { Route, SharedState } from "front-end/lib/app/types";
import { component as component_ } from "front-end/lib/framework";
import { TextColor } from "front-end/lib/types";
import { routeDest } from "front-end/lib/views/link";
import ProgramCard from "front-end/lib/views/program-card";
import React from "react";
import { Row } from "reactstrap";
import * as cwu from "shared/lib/resources/opportunity/code-with-us";
import * as swu from "shared/lib/resources/opportunity/sprint-with-us";
import { UserType } from "shared/lib/resources/user";
import { adt, ADT } from "shared/lib/types";

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
> = isUserType({
  userType: [UserType.Government, UserType.Admin],
  success() {
    return [
      { empty: true },
      [component_.cmd.dispatch(component_.page.readyMsg())]
    ];
  },
  fail({ routePath, shared }) {
    return [
      { empty: true },
      [
        shared.session
          ? component_.cmd.dispatch(
              component_.global.replaceRouteMsg(
                adt("notFound" as const, {
                  path: routePath
                })
              )
            )
          : component_.cmd.dispatch(
              component_.global.newRouteMsg(
                adt("signIn" as const, {
                  redirectOnSuccess: routePath
                })
              )
            )
      ]
    ];
  }
});

const update: component_.page.Update<State, InnerMsg, Route> = ({ state }) => {
  return [state, []];
};

const view: component_.page.View<State, InnerMsg, Route> = () => {
  return (
    <div className="d-flex flex-column justify-content-center align-items-stretch flex-grow-1">
      <Row>
        <ProgramCard
          img={prefixPath("/images/illustrations/code_with_us.svg")}
          title="Code With Us"
          className="mb-4 mb-md-0"
          description={
            <span>
              Use a <em>Code With Us</em> opportunity to pay a fixed price of up
              to {cwu.FORMATTED_MAX_BUDGET} for the delivery of code that meets
              your acceptance criteria.
            </span>
          }
          wideLinks
          links={[
            {
              button: true,
              dest: routeDest(
                adt("contentView", "code-with-us-opportunity-guide")
              ),
              children: ["Read Guide"],
              color: "info" as TextColor,
              outline: true
            },
            {
              button: true,
              dest: routeDest(adt("opportunityCWUCreate", null)),
              children: ["Get Started"],
              color: "primary" as TextColor
            }
          ]}
        />
        <ProgramCard
          img={prefixPath("/images/illustrations/code_with_us.svg")}
          title="Team With Us"
          className="mb-4 mb-md-0"
          description={
            <span>
              Use a <em>Team With Us</em> opportunity to procure individual
              resources for your Agile product development team on a time and
              materials basis.
            </span>
          }
          wideLinks
          links={[
            {
              button: true,
              dest: routeDest(
                adt("contentView", "team-with-us-opportunity-guide")
              ),
              children: ["Read Guide"],
              color: "info" as TextColor,
              outline: true
            },
            {
              button: true,
              dest: routeDest(adt("opportunityTWUCreate", null)),
              children: ["Get Started"],
              color: "primary" as TextColor
            }
          ]}
        />
        <ProgramCard
          img={prefixPath("/images/illustrations/sprint_with_us.svg")}
          title="Sprint With Us"
          description={
            <span>
              Use a <em>Sprint With Us</em> opportunity to procure an Agile
              product development team for your digital service at a variable
              cost of up to {swu.FORMATTED_MAX_BUDGET}.
            </span>
          }
          wideLinks
          links={[
            {
              button: true,
              dest: routeDest(
                adt("contentView", "sprint-with-us-opportunity-guide")
              ),
              children: ["Read Guide"],
              color: "info" as TextColor,
              outline: true
            },
            {
              button: true,
              dest: routeDest(adt("opportunitySWUCreate", null)),
              children: ["Get Started"],
              color: "primary" as TextColor
            }
          ]}
        />
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
  backgroundColor: "c-opportunity-create-bg",
  //verticallyCentered: true,
  init,
  update,
  view,
  getMetadata() {
    return makePageMetadata("Create an Opportunity");
  }
};
