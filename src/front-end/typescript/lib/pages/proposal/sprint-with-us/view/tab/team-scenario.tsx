import { makeStartLoading, makeStopLoading } from "front-end/lib";
import { Route } from "front-end/lib/app/types";
import * as FormField from "front-end/lib/components/form-field";
import * as NumberField from "front-end/lib/components/form-field/number";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as toasts from "front-end/lib/pages/proposal/sprint-with-us/lib/toasts";
import ViewTabHeader from "front-end/lib/pages/proposal/sprint-with-us/lib/views/view-tab-header";
import * as Tab from "front-end/lib/pages/proposal/sprint-with-us/view/tab";
import { iconLinkSymbol, leftPlacement } from "front-end/lib/views/link";
import ReportCardList from "front-end/lib/views/report-card-list";
import React from "react";
import { Col, Row } from "reactstrap";
import { hasSWUOpportunityPassedTeamScenario } from "shared/lib/resources/opportunity/sprint-with-us";
import {
  NUM_SCORE_DECIMALS,
  SWUProposal,
  SWUProposalStatus,
  UpdateValidationErrors
} from "shared/lib/resources/proposal/sprint-with-us";
import { adt, ADT } from "shared/lib/types";
import { invalid } from "shared/lib/validation";
import { validateTeamScenarioScore } from "shared/lib/validation/proposal/sprint-with-us";

type ModalId = "enterScore";

export interface State extends Tab.Params {
  showModal: ModalId | null;
  enterScoreLoading: number;
  score: Immutable<NumberField.State>;
}

export type InnerMsg =
  | ADT<"showModal", ModalId>
  | ADT<"hideModal">
  | ADT<"submitScore">
  | ADT<
      "onSubmitScoreResponse",
      api.ResponseValidation<SWUProposal, UpdateValidationErrors>
    >
  | ADT<"scoreMsg", NumberField.Msg>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

function initScore(
  p: SWUProposal
): component_.base.InitReturnValue<NumberField.State, NumberField.Msg> {
  return NumberField.init({
    errors: [],
    validate: (v) => {
      if (v === null) {
        return invalid(["Please enter a valid score."]);
      }
      return validateTeamScenarioScore(v);
    },
    child: {
      step: 0.01,
      value:
        p.scenarioScore === null || p.scenarioScore === undefined
          ? null
          : p.scenarioScore,
      id: "swu-proposal-team-scenario-score"
    }
  });
}

const init: component_.base.Init<Tab.Params, State, Msg> = (params) => {
  const [scoreState, scoreCmds] = initScore(params.proposal);
  return [
    {
      ...params,
      showModal: null,
      enterScoreLoading: 0,
      score: immutable(scoreState)
    },
    component_.cmd.mapMany(scoreCmds, (msg) => adt("scoreMsg", msg) as Msg)
  ];
};

const startEnterScoreLoading = makeStartLoading<State>("enterScoreLoading");
const stopEnterScoreLoading = makeStopLoading<State>("enterScoreLoading");

const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "showModal":
      return [state.set("showModal", msg.value), []];
    case "hideModal":
      if (state.enterScoreLoading > 0) {
        return [state, []];
      }
      return [state.set("showModal", null), []];
    case "submitScore": {
      const score = FormField.getValue(state.score);
      if (score === null) {
        return [state, []];
      }
      return [
        startEnterScoreLoading(state),
        [
          api.proposals.swu.update(
            state.proposal.id,
            adt("scoreTeamScenario", score),
            (response) => adt("onSubmitScoreResponse", response)
          ) as component_.Cmd<Msg>
        ]
      ];
    }
    case "onSubmitScoreResponse": {
      state = stopEnterScoreLoading(state);
      const result = msg.value;
      switch (result.tag) {
        case "valid": {
          const [scoreState, scoreCmds] = initScore(result.value);
          return [
            state
              .set("score", immutable(scoreState))
              .set("showModal", null)
              .set("proposal", result.value),
            [
              ...component_.cmd.mapMany(
                scoreCmds,
                (msg) => adt("scoreMsg", msg) as Msg
              ),
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("success", toasts.scored.success("Team Scenario"))
                )
              )
            ]
          ];
        }
        case "invalid": {
          let score = state.score;
          if (
            result.value.proposal &&
            result.value.proposal.tag === "scoreTeamScenario"
          ) {
            score = FormField.setErrors(score, result.value.proposal.value);
          }
          return [
            state.set("score", score),
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("error", toasts.scored.error("Team Scenario"))
                )
              )
            ]
          ];
        }
        case "unhandled":
        default:
          return [
            state,
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("error", toasts.scored.error("Team Scenario"))
                )
              )
            ]
          ];
      }
    }
    case "scoreMsg":
      return component_.base.updateChild({
        state,
        childStatePath: ["score"],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("scoreMsg", value) as Msg
      });
    default:
      return [state, []];
  }
};

const view: component_.base.ComponentView<State, Msg> = ({ state }) => {
  return (
    <div>
      <ViewTabHeader proposal={state.proposal} viewerUser={state.viewerUser} />
      <Row className="mt-5">
        <Col xs="12">
          {state.proposal.scenarioScore !== null &&
          state.proposal.scenarioScore !== undefined ? (
            <ReportCardList
              reportCards={[
                {
                  icon: "star-full",
                  iconColor: "c-report-card-icon-highlight",
                  name: "Team Scenario Score",
                  value: `${String(
                    state.proposal.scenarioScore.toFixed(NUM_SCORE_DECIMALS)
                  )}%`
                }
              ]}
            />
          ) : (
            <div className="pt-5 border-top">
              If this proposal is screened into the Team Scenario, it can be
              scored once the opportunity reaches the Team Scenario too.
            </div>
          )}
        </Col>
      </Row>
    </div>
  );
};

function isValid(state: Immutable<State>): boolean {
  return FormField.isValid(state.score);
}

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view,

  onInitResponse() {
    return component_.page.readyMsg();
  },

  getModal: (state) => {
    const isEnterScoreLoading = state.enterScoreLoading > 0;
    const valid = isValid(state);
    switch (state.showModal) {
      case "enterScore":
        return component_.page.modal.show({
          title: "Enter Score",
          onCloseMsg: adt("hideModal") as Msg,
          actions: [
            {
              text: "Submit Score",
              icon: "star-full",
              color: "primary",
              button: true,
              loading: isEnterScoreLoading,
              disabled: isEnterScoreLoading || !valid,
              msg: adt("submitScore")
            },
            {
              text: "Cancel",
              color: "secondary",
              disabled: isEnterScoreLoading,
              msg: adt("hideModal")
            }
          ],
          body: (dispatch) => (
            <div>
              <p>Provide a score for the proponent{"'"}s Team Scenario.</p>
              <NumberField.view
                extraChildProps={{ suffix: "%" }}
                required
                disabled={isEnterScoreLoading}
                label="Team Scenario Score"
                placeholder="Team Scenario Score"
                help={`Enter this proponent's score for the Team Scenario stage of the evaluation process as a percentage (up to two decimal places).`}
                dispatch={component_.base.mapDispatch(dispatch, (v) =>
                  adt("scoreMsg" as const, v)
                )}
                state={state.score}
              />
            </div>
          )
        });
      case null:
        return component_.page.modal.hide();
    }
  },

  getActions: ({ state, dispatch }) => {
    if (!hasSWUOpportunityPassedTeamScenario(state.opportunity)) {
      return component_.page.actions.none();
    }
    const proposal = state.proposal;
    const propStatus = proposal.status;
    switch (propStatus) {
      case SWUProposalStatus.UnderReviewTeamScenario:
        return component_.page.actions.links([
          {
            children: "Enter Score",
            symbol_: leftPlacement(iconLinkSymbol("star-full")),
            button: true,
            color: "primary",
            onClick: () => dispatch(adt("showModal", "enterScore" as const))
          }
        ]);
      case SWUProposalStatus.EvaluatedTeamScenario:
        return component_.page.actions.links([
          {
            children: "Edit Score",
            symbol_: leftPlacement(iconLinkSymbol("star-full")),
            button: true,
            color: "info",
            onClick: () => dispatch(adt("showModal", "enterScore" as const))
          }
        ]);
      default:
        return component_.page.actions.none();
    }
  }
};
