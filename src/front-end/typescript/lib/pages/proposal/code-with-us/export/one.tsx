import {
  getMetadataValid,
  makePageMetadata,
  TITLE_SEPARATOR,
  viewValid,
  updateValid
} from "front-end/lib";
import { isSignedIn } from "front-end/lib/access-control";
import { Route, SharedState } from "front-end/lib/app/types";
import {
  immutable,
  Immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import ExportedProposal from "front-end/lib/pages/proposal/code-with-us/lib/views/exported-proposal";
import { iconLinkSymbol, leftPlacement } from "front-end/lib/views/link";
import React from "react";
import {
  CWUProposal,
  getCWUProponentName
} from "shared/lib/resources/proposal/code-with-us";
import { User } from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import { invalid, valid, Validation } from "shared/lib/validation";

interface ValidState {
  proposal: CWUProposal | null;
  viewerUser: User;
  exportedAt: Date;
}

export type State = Validation<Immutable<ValidState>, null>;

export type InnerMsg = ADT<"onInitResponse", CWUProposal>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

export interface RouteParams {
  opportunityId: Id;
  proposalId: Id;
}

const init: component_.page.Init<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = isSignedIn({
  success({ routePath, routeParams, shared }) {
    const { proposalId, opportunityId } = routeParams;
    return [
      valid(
        immutable({
          proposal: null,
          viewerUser: shared.sessionUser,
          exportedAt: new Date()
        })
      ) as State,
      [
        api.proposals.cwu.readOne(opportunityId)(proposalId, (response) => {
          switch (response.tag) {
            case "valid":
              return adt("onInitResponse", response.value);
            case "invalid":
            case "unhandled":
              return component_.global.replaceRouteMsg(
                adt("notFound" as const, { path: routePath })
              );
          }
        }) as component_.Cmd<Msg>
      ]
    ];
  },
  fail({ routePath }) {
    return [
      invalid(null),
      [
        component_.cmd.dispatch(
          component_.global.replaceRouteMsg(
            adt("notFound" as const, { path: routePath })
          )
        )
      ]
    ];
  }
});

const update: component_.page.Update<State, InnerMsg, Route> = updateValid(
  ({ state, msg }) => {
    switch (msg.tag) {
      case "onInitResponse":
        return [
          state.set("proposal", msg.value),
          [component_.cmd.dispatch(component_.page.readyMsg())]
        ];
      default:
        return [state, []];
    }
  }
);

const view: component_.page.View<State, InnerMsg, Route> = viewValid(
  ({ state }) => {
    const proposal = state.proposal;
    if (!proposal) return null;
    return (
      <ExportedProposal
        showOpportunityInformation
        exportedAt={state.exportedAt}
        exportedBy={state.viewerUser}
        proposal={proposal}
      />
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
  getMetadata: getMetadataValid((state) => {
    return makePageMetadata(
      state.proposal
        ? `${getCWUProponentName(state.proposal)} ${TITLE_SEPARATOR} ${
            state.proposal.opportunity.title
          } ${TITLE_SEPARATOR} Exported Code With Us Proposal`
        : "Exported Code With Us Proposal"
    );
  }, makePageMetadata("Exported Code With Us Proposal")),
  getActions() {
    return component_.page.actions.links([
      {
        children: "Print",
        symbol_: leftPlacement(iconLinkSymbol("print")),
        color: "primary",
        button: true,
        //FIXME printing should be a Cmd
        onClick: () => window.print()
      }
    ]);
  }
};
