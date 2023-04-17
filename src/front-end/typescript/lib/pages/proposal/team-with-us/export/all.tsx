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
  twuOpportunityStatusToColor,
  twuOpportunityStatusToTitleCase
} from "front-end/lib/pages/opportunity/team-with-us/lib";
import ExportedProposal from "front-end/lib/pages/proposal/team-with-us/lib/views/exported-proposal";
import Badge from "front-end/lib/views/badge";
import DescriptionList from "front-end/lib/views/description-list";
import { iconLinkSymbol, leftPlacement } from "front-end/lib/views/link";
import React from "react";
import { Col, Row } from "reactstrap";
import { formatDateAndTime } from "shared/lib";
import { TWUOpportunity } from "shared/lib/resources/opportunity/team-with-us";
import {
  TWUProposal,
  TWUProposalSlim
} from "shared/lib/resources/proposal/team-with-us";
import { User, UserType } from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import { invalid, valid, Validation } from "shared/lib/validation";

interface ValidState {
  opportunity: TWUOpportunity | null;
  proposals: TWUProposal[];
  viewerUser: User;
  exportedAt: Date;
  anonymous: boolean;
}

export type State = Validation<Immutable<ValidState>, null>;

export type InnerMsg = ADT<"onInitResponse", [TWUOpportunity, TWUProposal[]]>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

export interface RouteParams {
  opportunityId: Id;
  anonymous: boolean;
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
    const { opportunityId, anonymous } = routeParams;
    return [
      valid(
        immutable({
          opportunity: null,
          proposals: [],
          viewerUser: shared.sessionUser,
          exportedAt: new Date(),
          anonymous
        })
      ) as State,
      [
        component_.cmd.join(
          api.opportunities.twu.readOne<TWUOpportunity | null>()(
            opportunityId,
            (response) => (api.isValid(response) ? response.value : null)
          ),
          component_.cmd.andThen(
            api.proposals.twu.readMany<TWUProposalSlim[]>(opportunityId)(
              (response) => api.getValidValue(response, [])
            ),
            (slimProposals) => {
              return component_.cmd.map(
                component_.cmd.sequence(
                  slimProposals.map(({ id }) =>
                    api.proposals.swu.readOne(opportunityId)(id, (a) =>
                      api.isValid(a) ? a.value : null
                    )
                  )
                ),
                (proposals) => {
                  return proposals.reduce((acc, proposal) => {
                    return proposal
                      ? [...(acc as TWUProposal[]), proposal]
                      : acc;
                  }, []);
                }
              );
            }
          ),
          (opportunity, proposals) => {
            if (!opportunity) {
              return component_.global.replaceRouteMsg(
                adt("notFound" as const, { path: routePath })
              );
            } else {
              return adt("onInitResponse", [opportunity, proposals]);
            }
          }
        ) as component_.Cmd<Msg>
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
    const proposals = state.proposals;
    if (!opportunity) return null;
    const anonymous = state.anonymous;
    return (
      <div>
        <Row>
          <Col xs="12">
            <h1 className="mb-4">{opportunity.title}</h1>
            <DescriptionList
              items={[
                { name: "ID", children: opportunity.id },
                { name: "Type", children: "Team With Us" },
                {
                  name: "Status",
                  children: (
                    <Badge
                      text={twuOpportunityStatusToTitleCase(opportunity.status)}
                      color={twuOpportunityStatusToColor(opportunity.status)}
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
            key={`twu-proposal-export-${i}`}
            className="mt-5 pt-5 border-top"
            opportunity={opportunity}
            proposal={p}
            anonymous={anonymous}
            exportedBy={state.viewerUser}
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
    const opportunity = state.opportunity;
    if (!opportunity)
      return makePageMetadata("Exported Team With Us Proposals");
    return makePageMetadata(
      `${opportunity.title} ${TITLE_SEPARATOR} Exported Team With Us Proposals`
    );
  }, makePageMetadata("Exported Team With Us Proposals")),
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
