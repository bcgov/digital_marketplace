import { Route } from "front-end/lib/app/types";
import * as History from "front-end/lib/components/table/history";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as Tab from "front-end/lib/pages/opportunity/code-with-us/edit/tab";
import { opportunityToHistoryItems } from "front-end/lib/pages/opportunity/code-with-us/lib";
import EditTabHeader from "front-end/lib/pages/opportunity/code-with-us/lib/views/edit-tab-header";
import React from "react";
import { Col, Row } from "reactstrap";
import { adt, ADT } from "shared/lib/types";
import { CWUOpportunity } from "shared/lib/resources/opportunity/code-with-us";

export interface State extends Tab.Params {
  opportunity: CWUOpportunity | null;
  history: Immutable<History.State> | null;
}

export type InnerMsg =
  | ADT<"onInitResponse", Tab.InitResponse>
  | ADT<"history", History.Msg>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

const init: component_.base.Init<Tab.Params, State, Msg> = (params) => {
  return [
    {
      ...params,
      opportunity: null,
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
      const opportunity = msg.value[0];
      const [historyState, historyCmds] = History.init({
        idNamespace: "cwu-opportunity-history",
        items: opportunityToHistoryItems(opportunity),
        viewerUser: state.viewerUser
      });
      return [
        state
          .set("opportunity", opportunity)
          .set("history", immutable(historyState)),
        [
          component_.cmd.dispatch(component_.page.readyMsg()),
          ...component_.cmd.mapMany(
            historyCmds,
            (msg) => adt("history", msg) as Msg
          )
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
  if (!state.opportunity || !state.history) return null;
  return (
    <div>
      <EditTabHeader
        opportunity={state.opportunity}
        viewerUser={state.viewerUser}
      />
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
