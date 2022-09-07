import { makeStartLoading, makeStopLoading } from "front-end/lib";
import { Route } from "front-end/lib/app/types";
import * as FormField from "front-end/lib/components/form-field";
import * as NumberField from "front-end/lib/components/form-field/number";
import {
  ComponentView,
  GlobalComponentMsg,
  Immutable,
  immutable,
  Init,
  mapComponentDispatch,
  toast,
  Update,
  updateComponentChild
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
  SWUProposalStatus
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
  | ADT<"scoreMsg", NumberField.Msg>;

export type Msg = GlobalComponentMsg<InnerMsg, Route>;

async function initScore(
  p: SWUProposal
): Promise<Immutable<NumberField.State>> {
  return immutable(
    await NumberField.init({
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
    })
  );
}

const init: Init<Tab.Params, State> = async (params) => {
  return {
    ...params,
    showModal: null,
    enterScoreLoading: 0,
    score: await initScore(params.proposal)
  };
};

const startEnterScoreLoading = makeStartLoading<State>("enterScoreLoading");
const stopEnterScoreLoading = makeStopLoading<State>("enterScoreLoading");

const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "showModal":
      return [state.set("showModal", msg.value)];
    case "hideModal":
      if (state.enterScoreLoading > 0) {
        return [state];
      }
      return [state.set("showModal", null)];
    case "submitScore":
      return [
        startEnterScoreLoading(state),
        async (state, dispatch) => {
          state = stopEnterScoreLoading(state);
          const score = FormField.getValue(state.score);
          if (score === null) {
            return state;
          }
          const result = await api.proposals.swu.update(
            state.proposal.id,
            adt("scoreTeamScenario", score)
          );
          switch (result.tag) {
            case "valid":
              dispatch(
                toast(adt("success", toasts.scored.success("Team Scenario")))
              );
              return state
                .set("score", await initScore(result.value))
                .set("showModal", null)
                .set("proposal", result.value);
            case "invalid": {
              dispatch(
                toast(adt("error", toasts.scored.error("Team Scenario")))
              );
              let score = state.score;
              if (
                result.value.proposal &&
                result.value.proposal.tag === "scoreTeamScenario"
              ) {
                score = FormField.setErrors(score, result.value.proposal.value);
              }
              return state.set("score", score);
            }
            case "unhandled":
              dispatch(
                toast(adt("error", toasts.scored.error("Team Scenario")))
              );
              return state;
          }
        }
      ];
    case "scoreMsg":
      return updateComponentChild({
        state,
        childStatePath: ["score"],
        childUpdate: NumberField.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("scoreMsg", value) as Msg
      });
    default:
      return [state];
  }
};

const view: ComponentView<State, Msg> = ({ state, dispatch }) => {
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

  getModal: (state) => {
    const isEnterScoreLoading = state.enterScoreLoading > 0;
    const valid = isValid(state);
    switch (state.showModal) {
      case "enterScore":
        return {
          title: "Enter Score",
          onCloseMsg: adt("hideModal"),
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
                dispatch={mapComponentDispatch(dispatch, (v) =>
                  adt("scoreMsg" as const, v)
                )}
                state={state.score}
              />
            </div>
          )
        };
      case null:
        return null;
    }
  },

  getContextualActions: ({ state, dispatch }) => {
    if (!hasSWUOpportunityPassedTeamScenario(state.opportunity)) {
      return null;
    }
    const proposal = state.proposal;
    const propStatus = proposal.status;
    switch (propStatus) {
      case SWUProposalStatus.UnderReviewTeamScenario:
        return adt("links", [
          {
            children: "Enter Score",
            symbol_: leftPlacement(iconLinkSymbol("star-full")),
            button: true,
            color: "primary",
            onClick: () => dispatch(adt("showModal", "enterScore" as const))
          }
        ]);
      case SWUProposalStatus.EvaluatedTeamScenario:
        return adt("links", [
          {
            children: "Edit Score",
            symbol_: leftPlacement(iconLinkSymbol("star-full")),
            button: true,
            color: "info",
            onClick: () => dispatch(adt("showModal", "enterScore" as const))
          }
        ]);
      default:
        return null;
    }
  }
};
