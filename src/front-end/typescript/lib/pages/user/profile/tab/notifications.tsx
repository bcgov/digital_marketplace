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

type ModalId = ADT<"unsubscribe">;

export interface State extends Tab.Params {
  showModal: ModalId | null,
  newOpportunitiesLoading: number;
  newOpportunities: Immutable<Checkbox.State>;
}

export type InnerMsg =
  | ADT<"newOpportunities", Checkbox.Msg>
  | ADT<
      "onUpdateNotificationsResponse",
      api.ResponseValidation<User, UpdateValidationErrors>
    >
  | ADT<"updateNotifications", boolean>
  | ADT<"showModal", ModalId>
  | ADT<"hideModal">;;

export type Msg = component_.page.Msg<InnerMsg, Route>;

const init: component_.base.Init<Tab.Params, State, Msg> = ({
  viewerUser,
  profileUser,
  unsubscribe
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
      showModal: unsubscribe && newOpportunitiesState.child.value ? adt("unsubscribe") : null,
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
    case "hideModal":
      return [state.set("showModal", null), []];
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
        newState,
        [
          ...cmds,
          component_.cmd.dispatch(adt("updateNotifications", FormField.getValue(newState.newOpportunities)))
        ]
      ];
    }
    case "updateNotifications": {
      return [
        startNewOpportunitiesLoading(state)
          .set("showModal", null),
        [
          api.users.update(
            state.profileUser.id,
            adt("updateNotifications", msg.value),
            (response) => adt("onUpdateNotificationsResponse", response)
          ) as component_.Cmd<Msg>
        ]
      ];
    }
    case "onUpdateNotificationsResponse": {
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
  },
  getModal(state) {
    if (!state.showModal) {
      return component_.page.modal.hide();
    }
    switch (state.showModal.tag) {
      case "unsubscribe":
        return component_.page.modal.show({
          title: "Unsubscribe?",
          body: () =>
            `Are you sure you want to unsubscribe? ${state.profileUser.email ?? 'You'} will no longer receive notifications about new opportunities.`,
          onCloseMsg: adt("hideModal") as Msg,
          actions: [
            {
              text: "Unsubscribe",
              icon: "bell-slash-outline",
              color: "success",
              msg: adt("updateNotifications", false),
              button: true
            },
            {
              text: "Cancel",
              color: "secondary",
              msg: adt("hideModal")
            }
          ]
        });
      }
    }
};
