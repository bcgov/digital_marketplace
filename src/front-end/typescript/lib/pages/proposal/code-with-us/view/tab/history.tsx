import { Route } from "front-end/lib/app/types";
import * as History from "front-end/lib/components/table/history";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as Tab from "front-end/lib/pages/proposal/code-with-us/view/tab";
import {
  cwuProposalEventToTitleCase,
  cwuProposalStatusToColor,
  cwuProposalStatusToTitleCase
} from "front-end/lib/pages/proposal/code-with-us/lib";
import ViewTabHeader from "front-end/lib/pages/proposal/code-with-us/lib/views/view-tab-header";
import React from "react";
import { Col, Row } from "reactstrap";
import { CWUProposal } from "shared/lib/resources/proposal/code-with-us";
import { UserType } from "shared/lib/resources/user";
import { adt, ADT } from "shared/lib/types";

export interface State extends Tab.Params {
  proposal: CWUProposal | null;
  history: Immutable<History.State> | null;
}

export type InnerMsg =
  | ADT<"onInitResponse", Tab.InitResponse>
  | ADT<"history", History.Msg>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

function getHistoryItems(
  { history }: CWUProposal,
  viewerUserType: UserType
): History.Item[] {
  if (!history) {
    return [];
  }
  return history.map((s) => ({
    type: {
      text:
        s.type.tag === "status"
          ? cwuProposalStatusToTitleCase(s.type.value, viewerUserType)
          : cwuProposalEventToTitleCase(s.type.value),
      color:
        s.type.tag === "status"
          ? cwuProposalStatusToColor(s.type.value, viewerUserType)
          : undefined
    },
    note: s.note,
    createdAt: s.createdAt,
    createdBy: s.createdBy || undefined
  }));
}

const init: component_.base.Init<Tab.Params, State, Msg> = (params) => {
  return [
    {
      ...params,
      proposal: null,
      history: null
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
      const proposal = msg.value[0];
      const [historyState, historyCmds] = History.init({
        idNamespace: "cwu-proposal-history",
        items: getHistoryItems(proposal, state.viewerUser.type),
        viewerUser: state.viewerUser
      });
      return [
        state.set("proposal", proposal).set("history", immutable(historyState)),
        [
          ...component_.cmd.mapMany(
            historyCmds,
            (msg) => adt("history", msg) as Msg
          ),
          component_.cmd.dispatch(component_.page.readyMsg())
        ]
      ];
    }
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

const view: component_.page.View<State, InnerMsg, Route> = ({
  state,
  dispatch
}) => {
  if (!state.proposal || !state.history) return null;
  return (
    <div>
      <ViewTabHeader proposal={state.proposal} viewerUser={state.viewerUser} />
      <div className="mt-5 pt-5 border-top">
        <Row>
          <Col xs="12">
            <h3 className="mb-4">History</h3>
            <History.view
              state={state.history}
              dispatch={component_.base.mapDispatch(dispatch, (msg) =>
                adt("history" as const, msg)
              )}
            />
          </Col>
        </Row>
      </div>
    </div>
  );
};

export const component: Tab.Component<State, InnerMsg> = {
  init,
  update,
  view,
  onInitResponse(response) {
    return adt("onInitResponse", response);
  }
};
