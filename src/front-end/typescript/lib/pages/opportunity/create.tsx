import { makePageMetadata, prefixPath } from "front-end/lib";
import { isUserType } from "front-end/lib/access-control";
import { Route, SharedState } from "front-end/lib/app/types";
import {
  ComponentView,
  GlobalComponentMsg,
  newRoute,
  PageComponent,
  PageInit,
  replaceRoute,
  Update
} from "front-end/lib/framework";
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

type InnerMsg = ADT<"noop">;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

export type RouteParams = null;

const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType({
  userType: [UserType.Government, UserType.Admin],
  async success() {
    return { empty: true };
  },
  async fail({ dispatch, routePath, shared }) {
    if (!shared.session) {
      dispatch(
        newRoute(
          adt("signIn" as const, {
            redirectOnSuccess: routePath
          })
        )
      );
    } else {
      dispatch(
        replaceRoute(
          adt("notFound" as const, {
            path: routePath
          })
        )
      );
    }
    return { empty: true };
  }
});

const update: Update<State, Msg> = ({ state, msg }) => {
  return [state];
};

const view: ComponentView<State, Msg> = () => {
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

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  backgroundColor: "c-opportunity-create-bg",
  //verticallyCentered: true,
  init,
  update,
  view,
  getMetadata() {
    return makePageMetadata("Create an Opportunity");
  }
};
