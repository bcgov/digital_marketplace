import { makeStartLoading, makeStopLoading } from "front-end/lib";
import { Route } from "front-end/lib/app/types";
import * as FormField from "front-end/lib/components/form-field";
import * as Checkbox from "front-end/lib/components/form-field/checkbox";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as toasts from "front-end/lib/pages/user/lib/toasts";
import * as Tab from "front-end/lib/pages/user/profile/tab";
import React from "react";
import { Col, Row } from "reactstrap";
import { adt, ADT } from "shared/lib/types";
import { User, UpdateValidationErrors } from "shared/lib/resources/user";

export interface State extends Tab.Params {
  newOpportunitiesLoading: number;
  newOpportunities: Immutable<Checkbox.State>;
}

export type InnerMsg =
  | ADT<"newOpportunities", Checkbox.Msg>
  | ADT<
      "onToggleNewOpportunitiesResponse",
      api.ResponseValidation<User, UpdateValidationErrors>
    >;

export type Msg = component_.page.Msg<InnerMsg, Route>;

const init: component_.base.Init<Tab.Params, State, Msg> = ({
  viewerUser,
  profileUser
}) => {
  const [newOpportunitiesState, newOpportunitiesCmds] = Checkbox.init({
    errors: [],
    child: {
      value: !!profileUser.notificationsOn,
      id: "user-notifications-new-opportunities"
    }
  });
  return [
    {
      profileUser,
      viewerUser,
      newOpportunitiesLoading: 0,
      newOpportunities: immutable(newOpportunitiesState)
    },
    component_.cmd.mapMany(newOpportunitiesCmds, (msg) =>
      adt("newOpportunities", msg)
    )
  ];
};

const startNewOpportunitiesLoading = makeStartLoading<State>(
  "newOpportunitiesLoading"
);
const stopNewOpportunitiesLoading = makeStopLoading<State>(
  "newOpportunitiesLoading"
);

const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "newOpportunities": {
      const valueChanged =
        msg.value.tag === "child" && msg.value.value.tag === "onChange";
      const newOppResult = component_.base.updateChild({
        state,
        childStatePath: ["newOpportunities"],
        childUpdate: Checkbox.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("newOpportunities" as const, value)
      });
      if (!valueChanged) {
        return newOppResult;
      }
      // Checkbox value has changed, so persist to back-end.
      const [newState, cmds] = newOppResult;
      return [
        startNewOpportunitiesLoading(newState),
        [
          ...cmds,
          api.users.update(
            newState.profileUser.id,
            adt(
              "updateNotifications",
              FormField.getValue(newState.newOpportunities)
            ),
            (response) => adt("onToggleNewOpportunitiesResponse", response)
          ) as component_.Cmd<Msg>
        ]
      ];
    }
    case "onToggleNewOpportunitiesResponse": {
      state = stopNewOpportunitiesLoading(state);
      const response = msg.value;
      if (api.isValid(response)) {
        return [
          state
            .set("profileUser", response.value)
            .update("newOpportunities", (v) =>
              FormField.setValue(v, !!response.value.notificationsOn)
            ),
          [
            component_.cmd.dispatch(
              component_.global.showToastMsg(
                adt("success", toasts.updated.success)
              )
            )
          ]
        ];
      } else {
        return [
          state.update("newOpportunities", (v) =>
            FormField.setValue(v, !!state.profileUser.notificationsOn)
          ),
          [
            component_.cmd.dispatch(
              component_.global.showToastMsg(adt("error", toasts.updated.error))
            )
          ]
        ];
      }
    }
    default:
      return [state, []];
  }
};

const view: component_.page.View<State, InnerMsg, Route> = ({
  state,
  dispatch
}) => {
  const isNewOpportunitiesLoading = state.newOpportunitiesLoading > 0;
  const isLoading = isNewOpportunitiesLoading;
  return (
    <div>
      <Row className="mb-4">
        <Col xs="12">
          <h2>Notifications</h2>
          <p>
            Email notifications will be sent to <b>{state.profileUser.email}</b>{" "}
            for the options selected below. If this email address is incorrect
            please update your profile.
          </p>
        </Col>
      </Row>
      <Row>
        <Col xs="12">
          <Checkbox.view
            extraChildProps={{
              inlineLabel: "New opportunities.",
              loading: isNewOpportunitiesLoading
            }}
            label="Notify me about..."
            disabled={isLoading}
            state={state.newOpportunities}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("newOpportunities" as const, value)
            )}
          />
        </Col>
      </Row>
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
