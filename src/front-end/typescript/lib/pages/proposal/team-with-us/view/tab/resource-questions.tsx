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
import * as toasts from "front-end/lib/pages/proposal/team-with-us/lib/toasts";
import ViewTabHeader from "front-end/lib/pages/proposal/team-with-us/lib/views/view-tab-header";
import * as Tab from "front-end/lib/pages/proposal/team-with-us/view/tab";
import Accordion from "front-end/lib/views/accordion";
import { iconLinkSymbol, leftPlacement } from "front-end/lib/views/link";
import { ProposalMarkdown } from "front-end/lib/views/markdown";
import ReportCardList from "front-end/lib/views/report-card-list";
import Separator from "front-end/lib/views/separator";
import React from "react";
import { Alert, Col, Row } from "reactstrap";
import { countWords } from "shared/lib";
import {
  canTWUOpportunityBeScreenedInToChallenge,
  getQuestionByOrder,
  hasTWUOpportunityPassedChallenge,
  hasTWUOpportunityPassedResourceQuestions,
  TWUOpportunity
} from "shared/lib/resources/opportunity/team-with-us";
import {
  NUM_SCORE_DECIMALS,
  TWUProposal,
  TWUProposalStatus,
  TWUProposalResourceQuestionResponse,
  UpdateResourceQuestionScoreBody,
  UpdateValidationErrors
} from "shared/lib/resources/proposal/team-with-us";
import { adt, ADT } from "shared/lib/types";
import { invalid } from "shared/lib/validation";
import { validateResourceQuestionScoreScore } from "shared/lib/validation/proposal/team-with-us";

type ModalId = "enterScore";

export interface State extends Tab.Params {
  showModal: ModalId | null;
  enterScoreLoading: number;
  screenToFromLoading: number;
  openAccordions: Set<number>;
  scores: Array<Immutable<NumberField.State>>;
}

export type InnerMsg =
  | ADT<"toggleAccordion", number>
  | ADT<"showModal", ModalId>
  | ADT<"hideModal">
  | ADT<"submitScore">
  | ADT<
      "onSubmitScoreResponse",
      api.ResponseValidation<TWUProposal, UpdateValidationErrors>
    >
  | ADT<"screenIn">
  | ADT<"onScreenInResponse", TWUProposal | null>
  | ADT<"screenOut">
  | ADT<"onScreenOutResponse", TWUProposal | null>
  | ADT<"scoreMsg", [number, NumberField.Msg]>; //[index, msg]

export type Msg = component_.page.Msg<InnerMsg, Route>;

function initScores(
  opp: TWUOpportunity,
  prop: TWUProposal
): [Immutable<NumberField.State>[], component_.Cmd<Msg>[]] {
  return (prop.resourceQuestionResponses || []).reduce(
    ([states, cmds], r, i) => {
      const question = getQuestionByOrder(opp, r.order);
      const [state, cmd] = NumberField.init({
        errors: [],
        validate: (v) => {
          if (v === null) {
            return invalid(["Please enter a valid score."]);
          }
          return validateResourceQuestionScoreScore(v, question?.score || 0);
        },
        child: {
          step: 0.01,
          value: r.score === null || r.score === undefined ? null : r.score,
          id: `twu-proposal-question-score-${i}`
        }
      });
      return [
        [...states, immutable(state)],
        [
          ...cmds,
          ...component_.cmd.mapMany(
            cmd,
            (msg) => adt("scoreMsg", [i, msg]) as Msg
          )
        ]
      ];
    },
    [[], []] as [Immutable<NumberField.State>[], component_.Cmd<Msg>[]]
  );
}

const init: component_.base.Init<Tab.Params, State, Msg> = (params) => {
  const [scoreStates, scoreCmds] = initScores(
    params.opportunity,
    params.proposal
  );
  return [
    {
      ...params,
      showModal: null,
      screenToFromLoading: 0,
      enterScoreLoading: 0,
      openAccordions: new Set(
        params.proposal.resourceQuestionResponses.map((p, i) => i)
      ),
      scores: scoreStates
    },
    scoreCmds
  ];
};

const startScreenToFromLoading = makeStartLoading<State>("screenToFromLoading");
const stopScreenToFromLoading = makeStopLoading<State>("screenToFromLoading");
const startEnterScoreLoading = makeStartLoading<State>("enterScoreLoading");
const stopEnterScoreLoading = makeStopLoading<State>("enterScoreLoading");

const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "toggleAccordion":
      return [
        state.update("openAccordions", (s) => {
          if (s.has(msg.value)) {
            s.delete(msg.value);
          } else {
            s.add(msg.value);
          }
          return s;
        }),
        []
      ];
    case "showModal":
      return [state.set("showModal", msg.value), []];
    case "hideModal":
      if (state.enterScoreLoading > 0) {
        return [state, []];
      }
      return [state.set("showModal", null), []];
    case "submitScore": {
      const scores = state.proposal.resourceQuestionResponses.reduce(
        (acc, r, i) => {
          if (!acc) {
            return null;
          }
          const field = state.scores[i];
          if (!field) {
            return null;
          }
          const score = FormField.getValue(field);
          if (score === null) {
            return null;
          }
          acc.push({
            order: r.order,
            score
          });
          return acc;
        },
        [] as UpdateResourceQuestionScoreBody[] | null
      );
      if (scores === null) {
        return [state, []];
      }
      return [
        startEnterScoreLoading(state),
        [
          api.proposals.twu.update(
            state.proposal.id,
            adt("scoreQuestions", scores),
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
          const [scoreStates, scoreCmds] = initScores(
            state.opportunity,
            result.value
          );
          return [
            state
              .set("scores", scoreStates)
              .set("showModal", null)
              .set("proposal", result.value),
            [
              ...scoreCmds,
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("success", toasts.scored.success("Resource Questions"))
                )
              )
            ]
          ];
        }
        case "invalid": {
          let scores = state.scores;
          if (
            result.value.proposal &&
            result.value.proposal.tag === "scoreQuestions"
          ) {
            scores = result.value.proposal.value.map((e, i) =>
              FormField.setErrors(scores[i], e.score || [])
            );
          }
          return [
            state.set("scores", scores),
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("error", toasts.scored.error("Resource Questions"))
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
                  adt("error", toasts.scored.error("Resource Questions"))
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
          api.proposals.twu.update(
            state.proposal.id,
            adt("screenInToChallenge", ""),
            (response) =>
              adt(
                "onScreenInResponse",
                api.isValid(response) ? response.value : null
              )
          ) as component_.Cmd<Msg>
        ]
      ];
    case "onScreenInResponse": {
      state = stopScreenToFromLoading(state);
      const proposal = msg.value;
      if (proposal) {
        const [scoreStates, scoreCmds] = initScores(
          state.opportunity,
          proposal
        );
        return [
          state.set("scores", scoreStates).set("proposal", proposal),
          [
            ...scoreCmds,
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
          api.proposals.twu.update(
            state.proposal.id,
            adt("screenOutFromChallenge", ""),
            (response) =>
              adt(
                "onScreenOutResponse",
                api.isValid(response) ? response.value : null
              )
          ) as component_.Cmd<Msg>
        ]
      ];
    case "onScreenOutResponse": {
      state = stopScreenToFromLoading(state);
      const proposal = msg.value;
      if (proposal) {
        const [scoreStates, scoreCmds] = initScores(
          state.opportunity,
          proposal
        );
        return [
          state.set("scores", scoreStates).set("proposal", proposal),
          [
            ...scoreCmds,
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
        childStatePath: ["scores", String(msg.value[0])],
        childUpdate: NumberField.update,
        childMsg: msg.value[1],
        mapChildMsg: (value) => adt("scoreMsg", [msg.value[0], value]) as Msg
      });
    default:
      return [state, []];
  }
};

interface ResourceQuestionResponseViewProps {
  opportunity: TWUOpportunity;
  response: TWUProposalResourceQuestionResponse;
  index: number;
  isOpen: boolean;
  className?: string;
  toggleAccordion(): void;
}

const ResourceQuestionResponseView: component_.base.View<
  ResourceQuestionResponseViewProps
> = ({ opportunity, response, index, isOpen, className, toggleAccordion }) => {
  const question = getQuestionByOrder(opportunity, response.order);
  if (!question) {
    return null;
  }
  return (
    <Accordion
      className={className}
      toggle={() => toggleAccordion()}
      color="info"
      title={`Question ${index + 1}`}
      titleClassName="h3 mb-0"
      chevronWidth={1.5}
      chevronHeight={1.5}
      open={isOpen}>
      <p style={{ whiteSpace: "pre-line" }}>{question.question}</p>
      <div className="mb-3 small text-secondary d-flex flex-column flex-sm-row flex-nowrap">
        <div className="mb-2 mb-sm-0">
          {countWords(response.response)} / {question.wordLimit} word
          {question.wordLimit === 1 ? "" : "s"}
        </div>
        <Separator spacing="2" color="secondary" className="d-none d-sm-block">
          |
        </Separator>
        <div>
          {response.score === undefined || response.score === null
            ? `Unscored (${question.score} point${
                question.score === 1 ? "" : "s"
              } available)`
            : `${response.score} / ${question.score} point${
                question.score === 1 ? "" : "s"
              }`}
        </div>
      </div>
      <Alert color="primary" fade={false} className="mb-4">
        <div style={{ whiteSpace: "pre-line" }}>{question.guideline}</div>
      </Alert>
      <ProposalMarkdown box source={response.response || EMPTY_STRING} />
    </Accordion>
  );
};

const view: component_.base.ComponentView<State, Msg> = ({
  state,
  dispatch
}) => {
  const show = hasTWUOpportunityPassedResourceQuestions(state.opportunity);
  return (
    <div>
      <ViewTabHeader proposal={state.proposal} viewerUser={state.viewerUser} />
      {state.proposal.questionsScore !== null &&
      state.proposal.questionsScore !== undefined ? (
        <Row className="mt-5">
          <Col xs="12">
            <ReportCardList
              reportCards={[
                {
                  icon: "star-full",
                  iconColor: "c-report-card-icon-highlight",
                  name: "Team Questions Score",
                  value: `${String(
                    state.proposal.questionsScore.toFixed(NUM_SCORE_DECIMALS)
                  )}%`
                }
              ]}
            />
          </Col>
        </Row>
      ) : null}
      <div className="mt-5 pt-5 border-top">
        <Row>
          <Col xs="12">
            {show ? (
              <div>
                <h3 className="mb-4">Team Questions{"'"} Responses</h3>
                {state.proposal.resourceQuestionResponses.map((r, i, rs) => (
                  <ResourceQuestionResponseView
                    key={`twu-proposal-team-question-response-${i}`}
                    className={i < rs.length - 1 ? "mb-4" : ""}
                    opportunity={state.opportunity}
                    isOpen={state.openAccordions.has(i)}
                    toggleAccordion={() => dispatch(adt("toggleAccordion", i))}
                    index={i}
                    response={r}
                  />
                ))}
              </div>
            ) : (
              "This proposal's team questions will be available once the opportunity closes."
            )}
          </Col>
        </Row>
      </div>
    </div>
  );
};

function isValid(state: Immutable<State>): boolean {
  return state.scores.reduce(
    (acc, s) => acc && FormField.isValid(s),
    true as boolean
  );
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
              <p>
                Provide a score for each team question response submitted by the
                proponent.
              </p>
              {state.scores.map((s, i) => {
                return (
                  <NumberField.view
                    key={`twu-proposal-question-score-field-${i}`}
                    extraChildProps={{ suffix: "point(s)" }}
                    required
                    disabled={isEnterScoreLoading}
                    label={`Question ${i + 1} Score`}
                    placeholder="Score"
                    dispatch={component_.base.mapDispatch(
                      dispatch,
                      (v) => adt("scoreMsg" as const, [i, v]) as Msg
                    )}
                    state={s}
                  />
                );
              })}
            </div>
          )
        });
      case null:
        return component_.page.modal.hide();
    }
  },

  getActions: ({ state, dispatch }) => {
    const proposal = state.proposal;
    const propStatus = proposal.status;
    const isScreenToFromLoading = state.screenToFromLoading > 0;
    switch (propStatus) {
      case TWUProposalStatus.UnderReviewResourceQuestions:
        return component_.page.actions.links([
          {
            children: "Enter Score",
            symbol_: leftPlacement(iconLinkSymbol("star-full")),
            button: true,
            color: "primary",
            onClick: () => dispatch(adt("showModal", "enterScore" as const))
          }
        ]);
      case TWUProposalStatus.EvaluatedResourceQuestions:
        return component_.page.actions.links([
          ...(canTWUOpportunityBeScreenedInToChallenge(state.opportunity)
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
      case TWUProposalStatus.UnderReviewChallenge:
        if (hasTWUOpportunityPassedChallenge(state.opportunity)) {
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
