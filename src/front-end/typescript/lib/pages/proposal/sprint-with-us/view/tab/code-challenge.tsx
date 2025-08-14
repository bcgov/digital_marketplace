import { EMPTY_STRING } from "front-end/config";
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
import Link, {
  externalDest,
  iconLinkSymbol,
  leftPlacement
} from "front-end/lib/views/link";
import ReportCardList from "front-end/lib/views/report-card-list";
import React from "react";
import { Col, Row } from "reactstrap";
import {
  canSWUOpportunityBeScreenedInToTeamScenario,
  hasSWUOpportunityPassedCodeChallenge,
  hasSWUOpportunityPassedTeamScenario
} from "shared/lib/resources/opportunity/sprint-with-us";
import {
  isSWUProposalInCodeChallenge,
  NUM_SCORE_DECIMALS,
  SWUProposal,
  SWUProposalStatus,
  swuProposalTeamMembers,
  UpdateValidationErrors
} from "shared/lib/resources/proposal/sprint-with-us";
import { gitHubProfileLink } from "shared/lib/resources/user";
import { adt, ADT } from "shared/lib/types";
import { invalid } from "shared/lib/validation";
import { validateCodeChallengeScore } from "shared/lib/validation/proposal/sprint-with-us";

type ModalId = "enterScore";

export interface State extends Tab.Params {
  showModal: ModalId | null;
  enterScoreLoading: number;
  screenToFromLoading: number;
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
  | ADT<"screenIn">
  | ADT<"onScreenInResponse", SWUProposal | null>
  | ADT<"screenOut">
  | ADT<"onScreenOutResponse", SWUProposal | null>
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
      return validateCodeChallengeScore(v);
    },
    child: {
      step: 0.01,
      value:
        p.challengeScore === null || p.challengeScore === undefined
          ? null
          : p.challengeScore,
      id: "swu-proposal-code-challenge-score"
    }
  });
}

const init: component_.base.Init<Tab.Params, State, Msg> = (params) => {
  const [scoreState, scoreCmds] = initScore(params.proposal);
  return [
    {
      ...params,
      showModal: null,
      screenToFromLoading: 0,
      enterScoreLoading: 0,
      score: immutable(scoreState)
    },
    component_.cmd.mapMany(scoreCmds, (msg) => adt("scoreMsg", msg) as Msg)
  ];
};

const startScreenToFromLoading = makeStartLoading<State>("screenToFromLoading");
const stopScreenToFromLoading = makeStopLoading<State>("screenToFromLoading");
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
          api.proposals.swu.update<Msg>()(
            state.proposal.id,
            adt("scoreCodeChallenge", score),
            (response) => adt("onSubmitScoreResponse", response)
          )
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
                  adt("success", toasts.scored.success("Code Challenge"))
                )
              )
            ]
          ];
        }
        case "invalid": {
          let score = state.score;
          if (
            result.value.proposal &&
            result.value.proposal.tag === "scoreCodeChallenge"
          ) {
            score = FormField.setErrors(score, result.value.proposal.value);
          }
          return [
            state.set("score", score),
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("error", toasts.scored.error("Code Challenge"))
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
                  adt("error", toasts.scored.error("Code Challenge"))
                )
              )
            ]
          ];
      }
    }
    case "screenIn":
      return [
        startScreenToFromLoading(state).set("showModal", null),
        [
          api.proposals.swu.update<Msg>()(
            state.proposal.id,
            adt("screenInToTeamScenario", ""),
            (response) =>
              adt(
                "onScreenInResponse",
                api.isValid(response) ? response.value : null
              )
          )
        ]
      ];
    case "onScreenInResponse": {
      state = stopScreenToFromLoading(state);
      const proposal = msg.value;
      if (proposal) {
        const [scoreState, scoreCmds] = initScore(proposal);
        return [
          state.set("score", immutable(scoreState)).set("proposal", proposal),
          [
            ...component_.cmd.mapMany(
              scoreCmds,
              (msg) => adt("scoreMsg", msg) as Msg
            ),
            component_.cmd.dispatch(
              component_.global.showToastMsg(
                adt("success", toasts.screenedIn.success)
              )
            )
          ]
        ];
      } else {
        return [state, []];
      }
    }
    case "screenOut":
      return [
        startScreenToFromLoading(state).set("showModal", null),
        [
          api.proposals.swu.update<Msg>()(
            state.proposal.id,
            adt("screenOutFromTeamScenario", ""),
            (response) =>
              adt(
                "onScreenOutResponse",
                api.isValid(response) ? response.value : null
              )
          )
        ]
      ];
    case "onScreenOutResponse": {
      state = stopScreenToFromLoading(state);
      const proposal = msg.value;
      if (proposal) {
        const [scoreState, scoreCmds] = initScore(proposal);
        return [
          state.set("score", immutable(scoreState)).set("proposal", proposal),
          [
            ...component_.cmd.mapMany(
              scoreCmds,
              (msg) => adt("scoreMsg", msg) as Msg
            ),
            component_.cmd.dispatch(
              component_.global.showToastMsg(
                adt("success", toasts.screenedOut.success)
              )
            )
          ]
        ];
      } else {
        return [state, []];
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

const Participants: component_.base.View<Pick<State, "proposal">> = ({
  proposal
}) => {
  const participants = swuProposalTeamMembers(proposal, true);
  return (
    <div>
      <h4 className="mb-4">Participants</h4>
      <div className="table-responsive">
        <table className="table-hover">
          <thead className="table-light">
            <tr>
              <th style={{ width: "100%" }}>Name</th>
              <th className="text-nowrap" style={{ width: "0px" }}>
                GitHub Profile
              </th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p, i) => {
              const username = p.idpUsername;
              return (
                <tr key={`participant-${i}`}>
                  <td>{p.member.name}</td>
                  <td className="text-nowrap">
                    {username ? (
                      <Link
                        dest={externalDest(gitHubProfileLink(username))}
                        newTab>
                        {username}
                      </Link>
                    ) : (
                      EMPTY_STRING
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const view: component_.page.View<State, InnerMsg, Route> = ({ state }) => {
  return (
    <div>
      <ViewTabHeader proposal={state.proposal} viewerUser={state.viewerUser} />
      {state.proposal.challengeScore !== null &&
      state.proposal.challengeScore !== undefined ? (
        <Row className="mt-5">
          <Col xs="12">
            <ReportCardList
              reportCards={[
                {
                  icon: "star-full",
                  iconColor: "c-report-card-icon-highlight",
                  name: "Code Challenge Score",
                  value: `${String(
                    state.proposal.challengeScore.toFixed(NUM_SCORE_DECIMALS)
                  )}%`
                }
              ]}
            />
          </Col>
        </Row>
      ) : null}
      <Row className="mt-5">
        <Col xs="12">
          <div className="pt-5 border-top">
            {hasSWUOpportunityPassedCodeChallenge(state.opportunity) &&
            isSWUProposalInCodeChallenge(state.proposal) ? (
              <Participants proposal={state.proposal} />
            ) : (
              "If this proposal is screened into the Code Challenge, it can be scored once the opportunity has reached the Code Challenge too."
            )}
          </div>
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
              <p>Provide a score for the proponent{"'"}s Code Challenge.</p>
              <NumberField.view
                extraChildProps={{ suffix: "%" }}
                required
                disabled={isEnterScoreLoading}
                label="Code Challenge Score"
                placeholder="Code Challenge Score"
                help={`Enter the score of this proponent's submission for the Code Challenge stage of the evaluation process as a percentage (up to two decimal places).`}
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
    if (!hasSWUOpportunityPassedCodeChallenge(state.opportunity)) {
      return component_.page.actions.none();
    }
    const proposal = state.proposal;
    const propStatus = proposal.status;
    const isScreenToFromLoading = state.screenToFromLoading > 0;
    switch (propStatus) {
      case SWUProposalStatus.UnderReviewCodeChallenge:
        return component_.page.actions.links([
          {
            children: "Enter Score",
            symbol_: leftPlacement(iconLinkSymbol("star-full")),
            button: true,
            color: "primary",
            onClick: () => dispatch(adt("showModal", "enterScore" as const))
          }
        ]);
      case SWUProposalStatus.EvaluatedCodeChallenge:
        return component_.page.actions.links([
          ...(canSWUOpportunityBeScreenedInToTeamScenario(state.opportunity)
            ? [
                {
                  children: "Screen In",
                  symbol_: leftPlacement(iconLinkSymbol("stars")),
                  loading: isScreenToFromLoading,
                  disabled: isScreenToFromLoading,
                  button: true,
                  color: "primary" as const,
                  onClick: () => dispatch(adt("screenIn" as const))
                }
              ]
            : []),
          {
            children: "Edit Score",
            symbol_: leftPlacement(iconLinkSymbol("star-full")),
            disabled: isScreenToFromLoading,
            button: true,
            color: "info",
            onClick: () => dispatch(adt("showModal", "enterScore" as const))
          }
        ]) as component_.page.Actions;
      case SWUProposalStatus.UnderReviewTeamScenario:
        if (hasSWUOpportunityPassedTeamScenario(state.opportunity)) {
          return component_.page.actions.none();
        }
        return component_.page.actions.links([
          {
            children: "Screen Out",
            symbol_: leftPlacement(iconLinkSymbol("ban")),
            loading: isScreenToFromLoading,
            disabled: isScreenToFromLoading,
            button: true,
            color: "danger",
            onClick: () => dispatch(adt("screenOut" as const))
          }
        ]);
      default:
        return component_.page.actions.none();
    }
  }
};
