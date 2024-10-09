import { EMPTY_STRING } from "front-end/config";
// import { makeStartLoading, makeStopLoading } from "front-end/lib";
import { Route } from "front-end/lib/app/types";
// import * as FormField from "front-end/lib/components/form-field";
import * as NumberField from "front-end/lib/components/form-field/number";
import * as LongText from "front-end/lib/components/form-field/long-text";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import ViewTabHeader from "front-end/lib/pages/proposal/sprint-with-us/lib/views/view-tab-header";
import * as Tab from "front-end/lib/pages/proposal/sprint-with-us/view/tab";
import Accordion from "front-end/lib/views/accordion";
// import { iconLinkSymbol, leftPlacement } from "front-end/lib/views/link";
import { ProposalMarkdown } from "front-end/lib/views/markdown";
import ReportCardList from "front-end/lib/views/report-card-list";
import Separator from "front-end/lib/views/separator";
import React from "react";
import { Alert, Col, Row } from "reactstrap";
import { compareNumbers, countWords } from "shared/lib";
import {
  // canSWUOpportunityBeScreenedInToCodeChallenge,
  getQuestionByOrder,
  // hasSWUOpportunityPassedCodeChallenge,
  hasSWUOpportunityPassedTeamQuestions,
  hasSWUOpportunityPassedTeamQuestionsEvaluation,
  SWUEvaluationPanelMember,
  SWUOpportunity,
  SWUOpportunityStatus,
  SWUTeamQuestion
} from "shared/lib/resources/opportunity/sprint-with-us";
import {
  NUM_SCORE_DECIMALS,
  SWUProposal,
  // SWUProposalStatus,
  SWUProposalTeamQuestionResponse,
  UpdateValidationErrors
} from "shared/lib/resources/proposal/sprint-with-us";
import {
  getEvaluationById,
  getEvaluationScoreByOrder,
  SWUTeamQuestionResponseEvaluation,
  SWUTeamQuestionResponseEvaluationScores
} from "shared/lib/resources/question-evaluation/sprint-with-us";
import { adt, ADT } from "shared/lib/types";
import { invalid } from "shared/lib/validation";
import {
  validateSWUTeamQuestionResponseEvaluationScoreNotes,
  validateSWUTeamQuestionResponseEvaluationScoreScore
} from "shared/lib/validation/question-evaluation/sprint-with-us";

interface EvaluationScore {
  score: Immutable<NumberField.State>;
  notes: Immutable<LongText.State>;
}

export interface State extends Tab.Params {
  enterScoreLoading: number;
  screenToFromLoading: number;
  openAccordions: Set<number>;
  individualEvaluationScores: EvaluationScore[][];
  consensusEvaluationScores: EvaluationScore[];
}

export type InnerMsg =
  | ADT<"toggleAccordion", number>
  | ADT<"submitScore">
  | ADT<
      "onSubmitScoreResponse",
      api.ResponseValidation<SWUProposal, UpdateValidationErrors>
    >
  | ADT<"screenIn">
  | ADT<"onScreenInResponse", SWUProposal | null>
  | ADT<"screenOut">
  | ADT<"onScreenOutResponse", SWUProposal | null>
  | ADT<
      "scoreMsgIndividual",
      { childMsg: NumberField.Msg; rIndex: number; eIndex: number }
    >
  | ADT<
      "notesMsgIndividual",
      { childMsg: LongText.Msg; rIndex: number; eIndex: number }
    >
  | ADT<"scoreMsgConsensus", { childMsg: NumberField.Msg; rIndex: number }>
  | ADT<"notesMsgConsensus", { childMsg: LongText.Msg; rIndex: number }>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

const initScore = (
  score: SWUTeamQuestionResponseEvaluationScores,
  question: SWUTeamQuestion | null,
  order: number,
  rIndex: number
): [
  EvaluationScore,
  [ReturnType<typeof NumberField.init>[1], ReturnType<typeof LongText.init>[1]]
] => {
  const [scoreState, scoreCmds] = NumberField.init({
    errors: [],
    validate: (v) => {
      if (v === null) {
        return invalid(["Please enter a valid score."]);
      }
      return validateSWUTeamQuestionResponseEvaluationScoreScore(
        v,
        question?.score || 0
      );
    },
    child: {
      step: 0.01,
      value:
        score.score === null || score.score === undefined ? null : score.score,
      id: `swu-proposal-question-score-${order}-${rIndex}`
    }
  });
  const [notesState, notesCmds] = LongText.init({
    errors: [],
    validate: validateSWUTeamQuestionResponseEvaluationScoreNotes,
    child: {
      value: score?.notes ?? "",
      id: `swu-proposal-question-notes-${order}-${rIndex}`
    }
  });

  return [
    {
      score: immutable(scoreState),
      notes: immutable(notesState)
    },
    [scoreCmds, notesCmds]
  ];
};

function initIndividualScores(
  opp: SWUOpportunity,
  prop: SWUProposal,
  evaluators: SWUEvaluationPanelMember[],
  evaluations: SWUTeamQuestionResponseEvaluation[]
): [EvaluationScore[][], component_.Cmd<Msg>[]] {
  return (prop.teamQuestionResponses || []).reduce(
    ([states, cmds], r, rIndex) => {
      // Gets the opp by response order
      const question = getQuestionByOrder(opp, r.order);

      const [questionScoreStates, questionScoreCmds] = evaluators.reduce<
        component_.base.InitReturnValue<EvaluationScore[], Msg>
      >(
        ([scoreStates, scoreCmds], epm, eIndex) => {
          const evaluation = getEvaluationById(evaluations, epm.user.id);
          if (!evaluation) {
            return [scoreStates, scoreCmds];
          }
          const score = getEvaluationScoreByOrder(evaluation, r.order);
          if (!score) {
            return [scoreStates, scoreCmds];
          }

          const [scoreState, [scoreScoreCmds, scoreNotesCmds]] = initScore(
            score,
            question,
            epm.order,
            rIndex
          );

          return [
            [...scoreStates, scoreState],
            [
              ...scoreCmds,
              ...[
                ...component_.cmd.mapMany(
                  scoreScoreCmds,
                  (childMsg) =>
                    adt("scoreMsgIndividual", {
                      rIndex,
                      eIndex,
                      childMsg
                    }) as Msg
                ),
                ...component_.cmd.mapMany(
                  scoreNotesCmds,
                  (childMsg) =>
                    adt("notesMsgIndividual", {
                      rIndex,
                      eIndex,
                      childMsg
                    }) as Msg
                )
              ]
            ]
          ];
        },
        [[], []]
      );

      return [
        [...states, questionScoreStates],
        [...cmds, ...questionScoreCmds]
      ];
    },
    [[], []] as [EvaluationScore[][], component_.Cmd<Msg>[]]
  );
}

function initConsensusScores(
  opp: SWUOpportunity,
  prop: SWUProposal,
  chair: SWUEvaluationPanelMember,
  evaluations: SWUTeamQuestionResponseEvaluation[]
): [EvaluationScore[], component_.Cmd<Msg>[]] {
  return (prop.teamQuestionResponses || []).reduce<
    [EvaluationScore[], component_.Cmd<Msg>[]]
  >(
    ([states, cmds], r, rIndex) => {
      const question = getQuestionByOrder(opp, r.order);

      const evaluation = getEvaluationById(evaluations, chair.user.id);
      if (!evaluation) {
        return [states, cmds];
      }
      const score = getEvaluationScoreByOrder(evaluation, r.order);
      if (!score) {
        return [states, cmds];
      }

      const [scoreState, [scoreScoreCmds, scoreNotesCmds]] = initScore(
        score,
        question,
        chair.order,
        rIndex
      );

      return [
        [...states, scoreState],
        [
          ...cmds,
          ...component_.cmd.mapMany(
            scoreScoreCmds,
            (childMsg) =>
              adt("scoreMsgConsensus", {
                rIndex,
                childMsg
              }) as Msg
          ),
          ...component_.cmd.mapMany(
            scoreNotesCmds,
            (childMsg) =>
              adt("notesMsgConsensus", {
                rIndex,
                childMsg
              }) as Msg
          )
        ]
      ];
    },
    [[], []]
  );
}

export const init: component_.base.Init<Tab.Params, State, Msg> = (params) => {
  const sortedEvaluators =
    params.opportunity.evaluationPanel?.sort((a, b) =>
      compareNumbers(a.order, b.order)
    ) ?? [];
  const chair = sortedEvaluators.filter((epm) => epm.chair)[0];
  const [individualScoreStates, individualScoreCmds] = initIndividualScores(
    params.opportunity,
    params.proposal,
    sortedEvaluators.filter((epm) => epm.evaluator),
    params.questionEvaluations
  );
  const [consensusScoreStates, consensusScoreCmds] = initConsensusScores(
    params.opportunity,
    params.proposal,
    chair,
    params.questionEvaluations
  );
  return [
    {
      ...params,
      showModal: null,
      screenToFromLoading: 0,
      enterScoreLoading: 0,
      openAccordions: new Set(
        params.proposal.teamQuestionResponses.map((p, i) => i)
      ),
      individualEvaluationScores: individualScoreStates,
      consensusEvaluationScores: consensusScoreStates
    },
    [...individualScoreCmds, ...consensusScoreCmds]
  ];
};

// const startScreenToFromLoading = makeStartLoading<State>("screenToFromLoading");
// const stopScreenToFromLoading = makeStopLoading<State>("screenToFromLoading");
// const startEnterScoreLoading = makeStartLoading<State>("enterScoreLoading");
// const stopEnterScoreLoading = makeStopLoading<State>("enterScoreLoading");

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
    // case "submitScore": {
    //   const scores = state.proposal.teamQuestionResponses.reduce(
    //     (acc, r, i) => {
    //       if (!acc) {
    //         return null;
    //       }
    //       const field = state.scores[i];
    //       if (!field) {
    //         return null;
    //       }
    //       const score = FormField.getValue(field);
    //       if (score === null) {
    //         return null;
    //       }
    //       acc.push({
    //         order: r.order,
    //         score
    //       });
    //       return acc;
    //     },
    //     [] as UpdateTeamQuestionScoreBody[] | null
    //   );
    //   if (scores === null) {
    //     return [state, []];
    //   }
    //   return [
    //     startEnterScoreLoading(state),
    //     [
    //       api.proposals.swu.update<Msg>()(
    //         state.proposal.id,
    //         adt("scoreQuestions", scores),
    //         (response) => adt("onSubmitScoreResponse", response)
    //       )
    //     ]
    //   ];
    // }
    // case "onSubmitScoreResponse": {
    //   state = stopEnterScoreLoading(state);
    //   const result = msg.value;
    //   switch (result.tag) {
    //     case "valid": {
    //       const [scoreStates, scoreCmds] = initScores(
    //         state.opportunity,
    //         result.value
    //       );
    //       return [
    //         state
    //           .set("scores", scoreStates)
    //           .set("showModal", null)
    //           .set("proposal", result.value),
    //         [
    //           ...scoreCmds,
    //           component_.cmd.dispatch(
    //             component_.global.showToastMsg(
    //               adt("success", toasts.scored.success("Team Questions"))
    //             )
    //           )
    //         ]
    //       ];
    //     }
    //     case "invalid": {
    //       let scores = state.scores;
    //       if (
    //         result.value.proposal &&
    //         result.value.proposal.tag === "scoreQuestions"
    //       ) {
    //         scores = result.value.proposal.value.map((e, i) =>
    //           FormField.setErrors(scores[i], e.score || [])
    //         );
    //       }
    //       return [
    //         state.set("scores", scores),
    //         [
    //           component_.cmd.dispatch(
    //             component_.global.showToastMsg(
    //               adt("error", toasts.scored.error("Team Questions"))
    //             )
    //           )
    //         ]
    //       ];
    //     }
    //     case "unhandled":
    //     default:
    //       return [
    //         state,
    //         [
    //           component_.cmd.dispatch(
    //             component_.global.showToastMsg(
    //               adt("error", toasts.scored.error("Team Questions"))
    //             )
    //           )
    //         ]
    //       ];
    //   }
    // }
    // case "screenIn":
    //   return [
    //     startScreenToFromLoading(state).set("showModal", null),
    //     [
    //       api.proposals.swu.update<Msg>()(
    //         state.proposal.id,
    //         adt("screenInToCodeChallenge", ""),
    //         (response) =>
    //           adt(
    //             "onScreenInResponse",
    //             api.isValid(response) ? response.value : null
    //           )
    //       )
    //     ]
    //   ];
    // case "onScreenInResponse": {
    //   state = stopScreenToFromLoading(state);
    //   const proposal = msg.value;
    //   if (proposal) {
    //     const [scoreStates, scoreCmds] = initScores(
    //       state.opportunity,
    //       proposal
    //     );
    //     return [
    //       state.set("scores", scoreStates).set("proposal", proposal),
    //       [
    //         ...scoreCmds,
    //         component_.cmd.dispatch(
    //           component_.global.showToastMsg(
    //             adt("success", toasts.screenedIn.success)
    //           )
    //         )
    //       ]
    //     ];
    //   } else {
    //     return [state, []];
    //   }
    // }
    // case "screenOut":
    //   return [
    //     startScreenToFromLoading(state).set("showModal", null),
    //     [
    //       api.proposals.swu.update<Msg>()(
    //         state.proposal.id,
    //         adt("screenOutFromCodeChallenge", ""),
    //         (response) =>
    //           adt(
    //             "onScreenOutResponse",
    //             api.isValid(response) ? response.value : null
    //           )
    //       )
    //     ]
    //   ];
    // case "onScreenOutResponse": {
    //   state = stopScreenToFromLoading(state);
    //   const proposal = msg.value;
    //   if (proposal) {
    //     const [scoreStates, scoreCmds] = initScores(
    //       state.opportunity,
    //       proposal
    //     );
    //     return [
    //       state.set("scores", scoreStates).set("proposal", proposal),
    //       [
    //         ...scoreCmds,
    //         component_.cmd.dispatch(
    //           component_.global.showToastMsg(
    //             adt("success", toasts.screenedOut.success)
    //           )
    //         )
    //       ]
    //     ];
    //   } else {
    //     return [state, []];
    //   }
    // }
    case "scoreMsgIndividual":
      return component_.base.updateChild({
        state,
        childStatePath: [
          "individualEvaluationScores",
          String(msg.value.rIndex),
          String(msg.value.eIndex),
          "score"
        ],
        childUpdate: NumberField.update,
        childMsg: msg.value.childMsg,
        mapChildMsg: (value) =>
          adt("scoreMsgIndividual", {
            rIndex: msg.value.rIndex,
            eIndex: msg.value.eIndex,
            childMsg: value
          }) as Msg
      });
    case "notesMsgIndividual":
      return component_.base.updateChild({
        state,
        childStatePath: [
          "individualEvaluationScores",
          String(msg.value.rIndex),
          String(msg.value.eIndex),
          "notes"
        ],
        childUpdate: LongText.update,
        childMsg: msg.value.childMsg,
        mapChildMsg: (value) =>
          adt("notesMsgIndividual", {
            rIndex: msg.value.rIndex,
            eIndex: msg.value.eIndex,
            childMsg: value
          }) as Msg
      });
    case "scoreMsgConsensus":
      return component_.base.updateChild({
        state,
        childStatePath: [
          "consensusEvaluationScores",
          String(msg.value.rIndex),
          "score"
        ],
        childUpdate: NumberField.update,
        childMsg: msg.value.childMsg,
        mapChildMsg: (value) =>
          adt("scoreMsgConsensus", {
            rIndex: msg.value.rIndex,
            childMsg: value
          }) as Msg
      });
    case "notesMsgConsensus":
      return component_.base.updateChild({
        state,
        childStatePath: [
          "consensusEvaluationScores",
          String(msg.value.rIndex),
          "notes"
        ],
        childUpdate: LongText.update,
        childMsg: msg.value.childMsg,
        mapChildMsg: (value) =>
          adt("notesMsgConsensus", {
            rIndex: msg.value.rIndex,
            childMsg: value
          }) as Msg
      });
    default:
      return [state, []];
  }
};

interface TeamQuestionResponseViewProps {
  opportunity: SWUOpportunity;
  response: SWUProposalTeamQuestionResponse;
  index: number;
  isOpen: boolean;
  className?: string;
  toggleAccordion(): void;
}

const TeamQuestionResponseView: component_.base.View<
  TeamQuestionResponseViewProps
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

const TeamQuestionResponsesView: component_.base.View<{
  state: State;
  dispatch: component_.base.Dispatch<Msg>;
}> = ({ state, dispatch }) => {
  const show = hasSWUOpportunityPassedTeamQuestions(state.opportunity);
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
                {state.proposal.teamQuestionResponses.map((r, i, rs) => (
                  <TeamQuestionResponseView
                    key={`swu-proposal-team-question-response-${i}`}
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

const TeamQuestionResponseEvalView: component_.base.View<
  TeamQuestionResponseViewProps
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

const TeamQuestionResponsesEvalView: component_.base.View<{
  state: State;
  dispatch: component_.base.Dispatch<Msg>;
}> = ({ state, dispatch }) => {
  const show = hasSWUOpportunityPassedTeamQuestionsEvaluation(
    state.opportunity
  );
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
                {state.proposal.teamQuestionResponses.map((r, i, rs) => (
                  <TeamQuestionResponseEvalView
                    key={`swu-proposal-team-question-response-${i}`}
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

const view: component_.base.ComponentView<State, Msg> = ({
  state,
  dispatch
}) => {
  return state.opportunity.status ===
    SWUOpportunityStatus.EvaluationTeamQuestionsPanel ? (
    <TeamQuestionResponsesEvalView state={state} dispatch={dispatch} />
  ) : (
    <TeamQuestionResponsesView state={state} dispatch={dispatch} />
  );
};

// function isValid(state: Immutable<State>): boolean {
//   return state.scores.reduce(
//     (acc, s) => acc && FormField.isValid(s),
//     true as boolean
//   );
// }

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view,

  onInitResponse() {
    return component_.page.readyMsg();
  },

  // getModal: (state) => {
  //   const isEnterScoreLoading = state.enterScoreLoading > 0;
  //   const valid = isValid(state);
  //   switch (state.showModal) {
  //     case "enterScore":
  //       return component_.page.modal.show({
  //         title: "Enter Score",
  //         onCloseMsg: adt("hideModal") as Msg,
  //         actions: [
  //           {
  //             text: "Submit Score",
  //             icon: "star-full",
  //             color: "primary",
  //             button: true,
  //             loading: isEnterScoreLoading,
  //             disabled: isEnterScoreLoading || !valid,
  //             msg: adt("submitScore")
  //           },
  //           {
  //             text: "Cancel",
  //             color: "secondary",
  //             disabled: isEnterScoreLoading,
  //             msg: adt("hideModal")
  //           }
  //         ],
  //         body: (dispatch) => (
  //           <div>
  //             <p>
  //               Provide a score for each team question response submitted by the
  //               proponent.
  //             </p>
  //             {state.scores.map((s, i) => {
  //               return (
  //                 <NumberField.view
  //                   key={`swu-proposal-question-score-field-${i}`}
  //                   extraChildProps={{ suffix: "point(s)" }}
  //                   required
  //                   disabled={isEnterScoreLoading}
  //                   label={`Question ${i + 1} Score`}
  //                   placeholder="Score"
  //                   dispatch={component_.base.mapDispatch(
  //                     dispatch,
  //                     (v) => adt("scoreMsg" as const, [i, v]) as Msg
  //                   )}
  //                   state={s}
  //                 />
  //               );
  //             })}
  //           </div>
  //         )
  //       });
  //     case null:
  //       return component_.page.modal.hide();
  //   }
  // },

  getActions: ({ state }) => {
    const proposal = state.proposal;
    const propStatus = proposal.status;
    // const isScreenToFromLoading = state.screenToFromLoading > 0;
    switch (propStatus) {
      // case SWUProposalStatus.UnderReviewTeamQuestions:
      //   return component_.page.actions.links([
      //     {
      //       children: "Enter Score",
      //       symbol_: leftPlacement(iconLinkSymbol("star-full")),
      //       button: true,
      //       color: "primary",
      //       onClick: () => dispatch(adt("showModal", "enterScore" as const))
      //     }
      //   ]);
      // case SWUProposalStatus.EvaluatedTeamQuestions:
      //   return component_.page.actions.links([
      //     ...(canSWUOpportunityBeScreenedInToCodeChallenge(state.opportunity)
      //       ? [
      //           {
      //             children: "Screen In",
      //             symbol_: leftPlacement(iconLinkSymbol("stars")),
      //             loading: isScreenToFromLoading,
      //             disabled: isScreenToFromLoading,
      //             button: true,
      //             color: "primary" as const,
      //             onClick: () => dispatch(adt("screenIn" as const))
      //           }
      //         ]
      //       : []),
      //     {
      //       children: "Edit Score",
      //       symbol_: leftPlacement(iconLinkSymbol("star-full")),
      //       disabled: isScreenToFromLoading,
      //       button: true,
      //       color: "info",
      //       onClick: () => dispatch(adt("showModal", "enterScore" as const))
      //     }
      //   ]) as component_.page.Actions;
      // case SWUProposalStatus.UnderReviewCodeChallenge:
      //   if (hasSWUOpportunityPassedCodeChallenge(state.opportunity)) {
      //     return component_.page.actions.none();
      //   }
      //   return component_.page.actions.links([
      //     {
      //       children: "Screen Out",
      //       symbol_: leftPlacement(iconLinkSymbol("ban")),
      //       loading: isScreenToFromLoading,
      //       disabled: isScreenToFromLoading,
      //       button: true,
      //       color: "danger",
      //       onClick: () => dispatch(adt("screenOut" as const))
      //     }
      //   ]);
      default:
        return component_.page.actions.none();
    }
  }
};
