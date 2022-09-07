import {
  getMetadataValid,
  makePageMetadata,
  TITLE_SEPARATOR,
  viewValid
} from "front-end/lib";
import { isUserType } from "front-end/lib/access-control";
import { Route, SharedState } from "front-end/lib/app/types";
import {
  ComponentView,
  GlobalComponentMsg,
  immutable,
  Immutable,
  PageComponent,
  PageInit,
  replaceRoute,
  Update
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import {
  swuOpportunityStatusToColor,
  swuOpportunityStatusToTitleCase
} from "front-end/lib/pages/opportunity/sprint-with-us/lib";
import ExportedProposal from "front-end/lib/pages/proposal/sprint-with-us/lib/views/exported-proposal";
import Badge from "front-end/lib/views/badge";
import DescriptionList from "front-end/lib/views/description-list";
import { iconLinkSymbol, leftPlacement } from "front-end/lib/views/link";
import React from "react";
import { Col, Row } from "reactstrap";
import { formatDateAndTime } from "shared/lib";
import { SWUOpportunity } from "shared/lib/resources/opportunity/sprint-with-us";
import { SWUProposal } from "shared/lib/resources/proposal/sprint-with-us";
import { User, UserType } from "shared/lib/resources/user";
import { adt, ADT, Id } from "shared/lib/types";
import { invalid, valid, Validation } from "shared/lib/validation";

interface ValidState {
  opportunity: SWUOpportunity;
  proposals: SWUProposal[];
  viewerUser: User;
  exportedAt: Date;
  anonymous: boolean;
}

export type State = Validation<Immutable<ValidState>, null>;

export type Msg = GlobalComponentMsg<ADT<"noop">, Route>;

export interface RouteParams {
  opportunityId: Id;
  anonymous: boolean;
}

const init: PageInit<RouteParams, SharedState, State, Msg> = isUserType({
  userType: [UserType.Admin, UserType.Government],
  async success({ routePath, routeParams, shared, dispatch }) {
    const { opportunityId, anonymous } = routeParams;
    const oppResult = await api.opportunities.swu.readOne(opportunityId);
    const propSlimResult = await api.proposals.swu.readMany(opportunityId);
    if (!api.isValid(oppResult) || !api.isValid(propSlimResult)) {
      dispatch(replaceRoute(adt("notFound" as const, { path: routePath })));
      return invalid(null);
    }
    const propResults = await Promise.all(
      propSlimResult.value.map(({ id }) =>
        api.proposals.swu.readOne(opportunityId, id)
      )
    );
    const proposals: SWUProposal[] = [];
    for (const proposal of propResults) {
      if (!api.isValid(proposal)) {
        dispatch(replaceRoute(adt("notFound" as const, { path: routePath })));
        return invalid(null);
      }
      proposals.push(proposal.value);
    }
    return valid(
      immutable({
        opportunity: oppResult.value,
        proposals,
        viewerUser: shared.sessionUser,
        exportedAt: new Date(),
        anonymous
      })
    );
  },
  async fail({ routePath, dispatch }) {
    dispatch(replaceRoute(adt("notFound" as const, { path: routePath })));
    return invalid(null);
  }
});

const update: Update<State, Msg> = ({ state, msg }) => {
  return [state];
};

const view: ComponentView<State, Msg> = viewValid(({ state }) => {
  const opportunity = state.opportunity;
  const proposals = state.proposals;
  const anonymous = state.anonymous;
  return (
    <div>
      <Row>
        <Col xs="12">
          <h1 className="mb-4">{opportunity.title}</h1>
          <DescriptionList
            items={[
              { name: "ID", children: opportunity.id },
              { name: "Type", children: "Sprint With Us" },
              {
                name: "Status",
                children: (
                  <Badge
                    text={swuOpportunityStatusToTitleCase(opportunity.status)}
                    color={swuOpportunityStatusToColor(opportunity.status)}
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
          key={`swu-proposal-export-${i}`}
          className="mt-5 pt-5 border-top"
          opportunity={opportunity}
          proposal={p}
          anonymous={anonymous}
          exportedBy={state.viewerUser}
        />
      ))}
    </div>
  );
});

export const component: PageComponent<RouteParams, SharedState, State, Msg> = {
  init,
  update,
  view,
  getMetadata: getMetadataValid((state) => {
    return makePageMetadata(
      `${state.opportunity.title} ${TITLE_SEPARATOR} Exported Sprint With Us Proposals`
    );
  }, makePageMetadata("Exported Sprint With Us Proposals")),
  getContextualActions({ state, dispatch }) {
    return adt("links", [
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
