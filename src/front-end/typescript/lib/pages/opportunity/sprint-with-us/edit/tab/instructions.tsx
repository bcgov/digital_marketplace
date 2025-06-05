import { Route } from "front-end/lib/app/types";
import { component as component_ } from "front-end/lib/framework";
import * as Tab from "front-end/lib/pages/opportunity/sprint-with-us/edit/tab";
import * as api from "front-end/lib/http/api";
import { SWUOpportunity } from "shared/lib/resources/opportunity/sprint-with-us";
import { adt, ADT } from "shared/lib/types";
import { SWU_PROPOSAL_EVALUATION_INSTRUCTIONS_ID } from "front-end/config";
import Markdown from "front-end/lib/views/markdown";
import React from "react";
import { Row, Col } from "reactstrap";
import EditTabHeader from "../../lib/views/edit-tab-header";
import Link, {
  iconLinkSymbol,
  leftPlacement,
  routeDest
} from "front-end/lib/views/link";

export interface State extends Tab.Params {
  opportunity: SWUOpportunity | null;
  instructionsContent: string;
}

export type InnerMsg =
  | ADT<"onInitResponse", Tab.InitResponse>
  | ADT<"initContent">
  | ADT<"onInitContent", string>
  | ADT<"noop">;

export type Msg = component_.page.Msg<InnerMsg, Route>;

const init: component_.base.Init<Tab.Params, State, Msg> = (params) => {
  return [
    {
      ...params,
      opportunity: null,
      instructionsContent: ""
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
        [component_.cmd.dispatch(adt("initContent"))]
      ];
    }
    case "initContent":
      return [
        state,
        [
          api.content.readOne<Msg>()(
            SWU_PROPOSAL_EVALUATION_INSTRUCTIONS_ID,
            (response) =>
              adt(
                "onInitContent",
                api.isValid(response) ? response.value.body : ""
              )
          )
        ]
      ];
    case "onInitContent": {
      const instructionsContent = msg.value;
      return [
        state.set("instructionsContent", instructionsContent),
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
    <div>
      <EditTabHeader
        opportunity={opportunity}
        viewerUser={props.state.viewerUser}
      />
      <div className="mt-5 pt-5 border-top">
        <Row>
          <Col xs="12">
            <Markdown
              openLinksInNewTabs
              source={props.state.instructionsContent}
            />
          </Col>
        </Row>
      </div>
      <div className="d-flex flex-row-reverse mt-5">
        <Link
          button
          color="primary"
          outline
          symbol_={leftPlacement(iconLinkSymbol("arrow-right"))}
          dest={routeDest(
            adt("opportunitySWUEdit", {
              opportunityId: opportunity.id,
              tab: "evaluation" as const
            }) as Route
          )}>
          Begin Evaluation
        </Link>
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
