import {
  getMetadataValid,
  makePageMetadata,
  TITLE_SEPARATOR,
  viewValid,
  updateValid
} from "front-end/lib";
import { isUserType } from "front-end/lib/access-control";
import { Route, SharedState } from "front-end/lib/app/types";
import {
  immutable,
  Immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import {
  cwuOpportunityStatusToColor,
  cwuOpportunityStatusToTitleCase
} from "front-end/lib/pages/opportunity/code-with-us/lib";
import ExportedProposal from "front-end/lib/pages/proposal/code-with-us/lib/views/exported-proposal";
import Badge from "front-end/lib/views/badge";
import DescriptionList from "front-end/lib/views/description-list";
import { iconLinkSymbol, leftPlacement } from "front-end/lib/views/link";
import React from "react";
import { Col, Row } from "reactstrap";
import { formatDateAndTime } from "shared/lib";
import { CWUOpportunity } from "shared/lib/resources/opportunity/code-with-us";
import {
  CWUProposal,
  CWUProposalSlim
} from "shared/lib/resources/proposal/code-with-us";
import { User, UserType } from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import { invalid, valid, Validation } from "shared/lib/validation";

interface ValidState {
  opportunity: CWUOpportunity | null;
  proposals: CWUProposal[];
  viewerUser: User;
  exportedAt: Date;
}

export type State = Validation<Immutable<ValidState>, null>;

export type InnerMsg = ADT<"onInitResponse", [CWUOpportunity, CWUProposal[]]>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

export interface RouteParams {
  opportunityId: Id;
}

const init: component_.page.Init<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = isUserType({
  userType: [UserType.Admin, UserType.Government],
  success({ routePath, routeParams, shared }) {
    const { opportunityId } = routeParams;
    return [
      valid(
        immutable({
          opportunity: null,
          proposals: [],
          viewerUser: shared.sessionUser,
          exportedAt: new Date()
        })
      ) as State,
      [
        component_.cmd.join(
          api.opportunities.cwu.readOne<
            api.ResponseValidation<CWUOpportunity, string[]>
          >()(opportunityId, (response) => response),
          component_.cmd.andThen(
            api.proposals.cwu.readMany<CWUProposalSlim[]>(opportunityId)(
              (response) => api.getValidValue(response, [])
            ),
            (slimProposals) =>
              component_.cmd.map(
                component_.cmd.sequence(
                  slimProposals.map(({ id }) =>
                    api.proposals.cwu.readOne<
                      api.ResponseValidation<CWUProposal, string[]>
                    >(opportunityId)(id, (a) => a)
                  )
                ),
                (proposalResponses) => {
                  return proposalResponses.reduce(
                    (proposals, proposalResponse) => {
                      return api.isValid(proposalResponse)
                        ? [...proposals, proposalResponse.value]
                        : proposals;
                    },
                    [] as CWUProposal[]
                  );
                }
              )
          ),
          (opportunityResponse, proposals) => {
            switch (opportunityResponse.tag) {
              case "valid":
                return adt("onInitResponse", [
                  opportunityResponse.value,
                  proposals
                ]) as Msg;
              case "invalid":
              case "unhandled":
                return component_.global.replaceRouteMsg(
                  adt("notFound" as const, { path: routePath })
                );
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

const update: component_.page.Update<State, InnerMsg, Route> = updateValid(
  ({ state, msg }) => {
    switch (msg.tag) {
      case "onInitResponse": {
        const [opportunity, proposals] = msg.value;
        return [
          state.set("opportunity", opportunity).set("proposals", proposals),
          [component_.cmd.dispatch(component_.page.readyMsg())]
        ];
      }
      default:
        return [state, []];
    }
  }
);

const view: component_.page.View<State, InnerMsg, Route> = viewValid(
  ({ state }) => {
    const opportunity = state.opportunity;
    if (!opportunity) return null;
    const proposals = state.proposals;
    return (
      <div>
        <Row>
          <Col xs="12">
            <h1 className="mb-4">{opportunity.title}</h1>
            <DescriptionList
              items={[
                { name: "ID", children: opportunity.id },
                { name: "Type", children: "Code With Us" },
                {
                  name: "Status",
                  children: (
                    <Badge
                      text={cwuOpportunityStatusToTitleCase(opportunity.status)}
                      color={cwuOpportunityStatusToColor(opportunity.status)}
                    />
                  )
                },
                { name: "Exported By", children: state.viewerUser.name },
                {
                  name: "Exported On",
                  children: formatDateAndTime(state.exportedAt)
                }
              ]}
            />
          </Col>
        </Row>
        {proposals.map((p, i) => (
          <ExportedProposal
            key={`cwu-proposal-export-${i}`}
            className="mt-5 pt-5 border-top"
            proposal={p}
          />
        ))}
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
  getMetadata: getMetadataValid((state) => {
    return makePageMetadata(
      state.opportunity
        ? `${state.opportunity.title} ${TITLE_SEPARATOR} Exported Code With Us Proposals`
        : "Exported Code With Us Proposals"
    );
  }, makePageMetadata("Exported Code With Us Proposals")),
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
