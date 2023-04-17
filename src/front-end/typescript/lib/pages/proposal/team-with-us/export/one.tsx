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
import ExportedProposal from "front-end/lib/pages/proposal/team-with-us/lib/views/exported-proposal";
import { iconLinkSymbol, leftPlacement } from "front-end/lib/views/link";
import React from "react";
import { TWUOpportunity } from "shared/lib/resources/opportunity/team-with-us";
import {
  getTWUProponentName,
  isTWUProposalInChallenge,
  TWUProposal
} from "shared/lib/resources/proposal/team-with-us";
import { User, UserType } from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import { invalid, valid, Validation } from "shared/lib/validation";

interface ValidState {
  proposal: TWUProposal | null;
  opportunity: TWUOpportunity | null;
  viewerUser: User;
  exportedAt: Date;
}

export type State = Validation<Immutable<ValidState>, null>;

export type InnerMsg = ADT<"onInitResponse", [TWUProposal, TWUOpportunity]>;

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
          opportunity: null,
          viewerUser: shared.sessionUser,
          exportedAt: new Date()
        })
      ) as State,
      [
        component_.cmd.join(
          api.proposals.twu.readOne<
            api.ResponseValidation<TWUProposal, string[]>
          >(opportunityId)(proposalId, (response) => response),
          api.opportunities.twu.readOne<
            api.ResponseValidation<TWUOpportunity, string[]>
          >()(opportunityId, (response) => response),
          (proposalResponse, opportunityResponse) => {
            if (
              !api.isValid(proposalResponse) ||
              !api.isValid(opportunityResponse)
            ) {
              return component_.global.replaceRouteMsg(
                adt("notFound" as const, { path: routePath })
              );
            } else {
              return adt("onInitResponse", [
                proposalResponse.value,
                opportunityResponse.value
              ]) as Msg;
            }
          }
        )
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

const update: component_.base.Update<State, Msg> = updateValid(
  ({ state, msg }) => {
    switch (msg.tag) {
      case "onInitResponse":
        return [
          state.set("proposal", msg.value[0]).set("opportunity", msg.value[1]),
          [component_.cmd.dispatch(component_.page.readyMsg())]
        ];
      default:
        return [state, []];
    }
  }
);

const view: component_.page.View<State, InnerMsg, Route> = viewValid(
  ({ state }) => {
    const opportunity = state.opportunity;
    const proposal = state.proposal;
    if (!opportunity || !proposal) return null;
    return (
      <ExportedProposal
        showOpportunityInformation
        exportedAt={state.exportedAt}
        exportedBy={state.viewerUser}
        opportunity={opportunity}
        proposal={proposal}
        anonymous={
          state.viewerUser.type !== UserType.Vendor &&
          !isTWUProposalInChallenge(proposal)
        }
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
    const proposal = state.proposal;
    if (!proposal) return makePageMetadata("Exported Team With Us Proposal");
    return makePageMetadata(
      `${getTWUProponentName(proposal)} ${TITLE_SEPARATOR} ${
        proposal.opportunity.title
      } ${TITLE_SEPARATOR} Exported Team With Us Proposal`
    );
  }, makePageMetadata("Exported Team With Us Proposal")),
  getActions() {
    return component_.page.actions.links([
      {
        children: "Print",
        symbol_: leftPlacement(iconLinkSymbol("print")),
        color: "primary",
        button: true,
        onClick: () => window.print()
      }
    ]);
  }
};
