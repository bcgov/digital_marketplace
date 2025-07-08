import { Route } from "front-end/lib/app/types";
import { component as component_ } from "front-end/lib/framework";
import * as Tab from "front-end/lib/pages/opportunity/code-with-us/edit/tab";
import { iconLinkSymbol, leftPlacement } from "front-end/lib/views/link";

import React from "react";
import {
  CWUOpportunity,
  CWUOpportunityStatus
} from "shared/lib/resources/opportunity/code-with-us";

import { isAdmin } from "shared/lib/resources/user";
import { adt, ADT } from "shared/lib/types";
import { prefixPath } from "front-end/lib";
import SummaryView from "./summary-view";

export interface State extends Tab.Params {
  opportunity: CWUOpportunity | null;
}

export type InnerMsg = ADT<"onInitResponse", Tab.InitResponse> | ADT<"noop">;

export type Msg = component_.page.Msg<InnerMsg, Route>;

const init: component_.base.Init<Tab.Params, State, Msg> = (params) => {
  return [
    {
      ...params,
      opportunity: null
    },
    []
  ];
};

const update: component_.page.Update<State, InnerMsg, Route> = ({
  state,
  msg
}) => {
  switch (msg.tag) {
    case "onInitResponse": {
      const opportunity = msg.value[0];
      return [
        state.set("opportunity", opportunity),
        [component_.cmd.dispatch(component_.page.readyMsg())]
      ];
    }
    default:
      return [state, []];
  }
};

const view: component_.page.View<State, InnerMsg, Route> = (props) => {
  const opportunity = props.state.opportunity;
  if (!opportunity) return null;
  return (
    <SummaryView
      opportunity={opportunity}
      viewerUser={props.state.viewerUser}
    />
  );
};

export const component: Tab.Component<State, InnerMsg> = {
  init,
  update,
  view,
  onInitResponse(response) {
    return adt("onInitResponse", response);
  },
  // Add "View Complete Competition" button action if the opportunity is awarded and the user is an admin
  getActions: ({ state }) => {
    const opportunity = state.opportunity;
    const viewerUser = state.viewerUser;
    if (
      !opportunity ||
      !isAdmin(viewerUser) ||
      opportunity.status !== CWUOpportunityStatus.Awarded
    ) {
      return component_.page.actions.none();
    }
    return component_.page.actions.links([
      {
        children: "View Complete Competition",
        symbol_: leftPlacement(iconLinkSymbol("external-link")),
        button: true,
        color: "primary" as const,
        onClick: () => {
          window.open(
            prefixPath(
              `/opportunities/code-with-us/${opportunity.id}/complete`
            ),
            "_blank"
          );
        }
      }
    ]);
  }
};
