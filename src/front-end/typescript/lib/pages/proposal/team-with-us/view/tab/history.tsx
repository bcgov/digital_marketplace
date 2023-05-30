import { Route } from "front-end/lib/app/types";
import * as History from "front-end/lib/components/table/history";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import {
  twuProposalEventToTitleCase,
  twuProposalStatusToColor,
  twuProposalStatusToTitleCase
} from "front-end/lib/pages/proposal/team-with-us/lib";
import ViewTabHeader from "front-end/lib/pages/proposal/team-with-us/lib/views/view-tab-header";
import * as Tab from "front-end/lib/pages/proposal/team-with-us/view/tab";
import React from "react";
import { Col, Row } from "reactstrap";
import {
  // hasTWUOpportunityPassedChallenge,
  hasTWUOpportunityPassedResourceQuestions
} from "shared/lib/resources/opportunity/team-with-us";
import { TWUProposal } from "shared/lib/resources/proposal/team-with-us";
import { UserType } from "shared/lib/resources/user";
import { adt, ADT } from "shared/lib/types";

export interface State extends Tab.Params {
  history: Immutable<History.State>;
}

export type InnerMsg = ADT<"history", History.Msg>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

function getHistoryItems(
  { history }: TWUProposal,
  viewerUserType: UserType
): History.Item[] {
  if (!history) {
    return [];
  }
  return history.map((s) => ({
    type: {
      text:
        s.type.tag === "status"
          ? twuProposalStatusToTitleCase(s.type.value, viewerUserType)
          : twuProposalEventToTitleCase(s.type.value),
      color:
        s.type.tag === "status"
          ? twuProposalStatusToColor(s.type.value, viewerUserType)
          : undefined
    },
    note: s.note,
    createdAt: s.createdAt,
    createdBy: s.createdBy || undefined
  }));
}

const init: component_.base.Init<Tab.Params, State, Msg> = (params) => {
  const [historyState, historyCmds] = History.init({
    idNamespace: "twu-proposal-history",
    items: getHistoryItems(params.proposal, params.viewerUser.type),
    viewerUser: params.viewerUser
  });
  return [
    {
      ...params,
      history: immutable(historyState)
    },
    component_.cmd.mapMany(historyCmds, (msg) => adt("history", msg) as Msg)
  ];
};

const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "history":
      return component_.base.updateChild({
        state,
        childStatePath: ["history"],
        childUpdate: History.update,
        childMsg: msg.value,
        mapChildMsg: (value) => ({ tag: "history", value })
      });
    default:
      return [state, []];
  }
};

const view: component_.base.ComponentView<State, Msg> = ({
  state,
  dispatch
}) => {
  return (
    <div>
      <ViewTabHeader proposal={state.proposal} viewerUser={state.viewerUser} />
      <div className="mt-5 pt-5 border-top">
        <Row>
          <Col xs="12">
            {hasTWUOpportunityPassedResourceQuestions(state.opportunity) &&
            state.proposal.history !== undefined ? (
              <div>
                <h3 className="mb-4">History</h3>
                <History.view
                  state={state.history}
                  dispatch={component_.base.mapDispatch(dispatch, (msg) =>
                    adt("history" as const, msg)
                  )}
                />
              </div>
            ) : (
              "This proposal's history will be available once the opportunity reaches the Challenge."
            )}
          </Col>
        </Row>
      </div>
    </div>
  );
};

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view,
  onInitResponse() {
    return component_.page.readyMsg();
  }
};
