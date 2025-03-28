import { makeStartLoading, makeStopLoading } from "front-end/lib";
import { Route } from "front-end/lib/app/types";
import * as EvaluationPanel from "front-end/lib/components/evaluation-panel";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as toasts from "front-end/lib/pages/opportunity/sprint-with-us/lib/toasts";
import * as Tab from "front-end/lib/pages/opportunity/sprint-with-us/edit/tab";
import EditTabHeader from "front-end/lib/pages/opportunity/sprint-with-us/lib/views/edit-tab-header";
import { iconLinkSymbol, leftPlacement } from "front-end/lib/views/link";
import React from "react";
import { Col, Row } from "reactstrap";
import {
  canChangeEvaluationPanel,
  SWUOpportunity,
  UpdateEditValidationErrors,
  UpdateValidationErrors
} from "shared/lib/resources/opportunity/sprint-with-us";
import { adt, ADT } from "shared/lib/types";

export interface State extends Tab.Params {
  opportunity: SWUOpportunity | null;
  evaluationPanel: Immutable<EvaluationPanel.State> | null;
  startEditingLoading: number;
  startSaveLoading: number;
  isEditing: boolean;
}

export type InnerMsg =
  | ADT<"onInitResponse", Tab.InitResponse>
  | ADT<"evaluationPanel", EvaluationPanel.Msg>
  | ADT<"startEditing">
  | ADT<
      "onStartEditingResponse",
      api.ResponseValidation<SWUOpportunity, string[]>
    >
  | ADT<"cancelEditing">
  | ADT<"save">
  | ADT<
      "onSaveResponse",
      api.ResponseValidation<SWUOpportunity, UpdateEditValidationErrors>
    >;

export type Msg = component_.page.Msg<InnerMsg, Route>;

function resetEvaluationPanel(
  state: Immutable<State>,
  opportunity: SWUOpportunity
): component_.page.UpdateReturnValue<State, InnerMsg, Route> {
  const [evaluationPanelState, evaluationPanelCommands] = EvaluationPanel.init({
    evaluationPanel: opportunity.evaluationPanel ?? []
  });
  return [
    state.merge({
      opportunity,
      evaluationPanel: immutable(evaluationPanelState)
    }),
    component_.cmd.mapMany(
      evaluationPanelCommands,
      (msg) => adt("evaluationPanel", msg) as Msg
    )
  ];
}

const init: component_.base.Init<Tab.Params, State, Msg> = (params) => {
  return [
    {
      ...params,
      opportunity: null,
      evaluationPanel: null,
      startEditingLoading: 0,
      startSaveLoading: 0,
      isEditing: false
    },
    []
  ];
};

const startStartEditingLoading = makeStartLoading<State>("startEditingLoading");
const stopStartEditingLoading = makeStopLoading<State>("startEditingLoading");
const startSaveLoading = makeStartLoading<State>("startSaveLoading");
const stopSaveLoading = makeStopLoading<State>("startSaveLoading");

const update: component_.page.Update<State, InnerMsg, Route> = ({
  state,
  msg
}) => {
  switch (msg.tag) {
    case "onInitResponse": {
      const opportunity = msg.value[0];
      const existingEvaluationPanel = opportunity.evaluationPanel;
      const [evaluationPanelState, evaluationPanelCmds] = EvaluationPanel.init({
        evaluationPanel: existingEvaluationPanel ?? []
      });
      return [
        state
          .set("opportunity", opportunity)
          .set("evaluationPanel", immutable(evaluationPanelState)),
        [
          ...component_.cmd.mapMany(
            evaluationPanelCmds,
            (msg) => adt("evaluationPanel", msg) as Msg
          ),
          component_.cmd.dispatch(component_.page.readyMsg())
        ]
      ];
    }
    case "evaluationPanel":
      return component_.base.updateChild({
        state,
        childStatePath: ["evaluationPanel"],
        childUpdate: EvaluationPanel.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("evaluationPanel", value)
      });
    case "startEditing": {
      const opportunity = state.opportunity;
      if (!opportunity) return [state, []];
      return [
        startStartEditingLoading(state),
        [
          api.opportunities.swu.readOne<Msg>()(opportunity.id, (response) =>
            adt("onStartEditingResponse", response)
          )
        ]
      ];
    }
    case "onStartEditingResponse": {
      const response = msg.value;
      state = stopStartEditingLoading(state);
      if (api.isValid(response)) {
        state = state.set("isEditing", true);
        return resetEvaluationPanel(state, response.value);
      } else {
        return [
          state,
          [
            component_.cmd.dispatch(
              component_.global.showToastMsg(
                adt("error", toasts.startedEditing.error)
              )
            )
          ]
        ];
      }
    }
    case "cancelEditing": {
      const opportunity = state.opportunity;
      if (!opportunity) return [state, []];
      state = state.merge({
        isEditing: false
      });
      return resetEvaluationPanel(state, opportunity);
    }
    case "save": {
      const opportunity = state.opportunity;
      const evaluationPaenl = state.evaluationPanel;
      if (!opportunity || !evaluationPaenl) return [state, []];
      const values = EvaluationPanel.getValues(evaluationPaenl);
      return [
        startSaveLoading(state),
        [
          api.opportunities.swu.update<Msg>()(
            opportunity.id,
            adt("editEvaluationPanel", values),
            (
              response: api.ResponseValidation<
                SWUOpportunity,
                UpdateValidationErrors
              >
            ) => {
              return adt(
                "onSaveResponse",
                api.mapInvalid(response, (errors) => {
                  if (
                    errors.opportunity &&
                    errors.opportunity.tag === "editEvaluationPanel"
                  ) {
                    return errors.opportunity.value;
                  } else {
                    return {};
                  }
                })
              );
            }
          )
        ]
      ];
    }
    case "onSaveResponse": {
      state = stopSaveLoading(state);
      const response = msg.value;
      switch (response.tag) {
        case "valid": {
          state = state.set("isEditing", false);
          const [resetState, resetCmds] = resetEvaluationPanel(
            state,
            response.value
          );
          return [
            resetState,
            [
              ...resetCmds,
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("success", toasts.changesPublished.success)
                )
              )
            ]
          ];
        }
        case "invalid":
          state = state.update(
            "evaluationPanel",
            (ep) =>
              ep &&
              EvaluationPanel.setErrors(ep, response.value.evaluationPanel)
          );
          return [
            state,
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("error", toasts.changesPublished.error)
                )
              )
            ]
          ];
        case "unhandled":
        default:
          return [
            state,
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("error", toasts.changesPublished.error)
                )
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
  if (!state.opportunity || !state.evaluationPanel) return null;
  const disabled = !state.isEditing || state.startEditingLoading > 0;
  return (
    <div>
      <EditTabHeader
        opportunity={state.opportunity}
        viewerUser={state.viewerUser}
      />
      <div className="mt-5 pt-5 border-top">
        <h2 className="mb-3">Evaluation Panel</h2>
        <Row>
          <Col xs="12">
            <EvaluationPanel.view
              dispatch={component_.base.mapDispatch(dispatch, (msg) =>
                adt("evaluationPanel" as const, msg)
              )}
              state={state.evaluationPanel}
              disabled={disabled}
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
  },

  getActions({ state, dispatch }) {
    if (!state.opportunity || !canChangeEvaluationPanel(state.opportunity))
      return component_.page.actions.none();
    const isEditingLoading = state.startEditingLoading > 0;
    const isSaveLoading = state.startSaveLoading > 0;
    const isLoading = isEditingLoading || isSaveLoading;
    const isValid =
      state.evaluationPanel && EvaluationPanel.isValid(state.evaluationPanel);
    return state.isEditing
      ? component_.page.actions.links([
          {
            children: "Save Changes",
            onClick: () => dispatch(adt("save") as Msg),
            button: true,
            loading: isLoading,
            disabled: isLoading || !isValid,
            symbol_: leftPlacement(iconLinkSymbol("bullhorn")),
            color: "primary"
          },
          {
            children: "Cancel",
            onClick: () => dispatch(adt("cancelEditing") as Msg)
          }
        ])
      : adt("links", [
          {
            children: "Edit",
            onClick: () => dispatch(adt("startEditing")),
            button: true,
            loading: isLoading,
            disabled: isLoading,
            symbol_: leftPlacement(iconLinkSymbol("user-edit")),
            color: "primary"
          }
        ]);
  }
};
