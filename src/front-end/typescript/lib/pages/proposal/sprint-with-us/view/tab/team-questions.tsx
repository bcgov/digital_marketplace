import { EMPTY_STRING } from "front-end/config";
// import { makeStartLoading, makeStopLoading } from "front-end/lib";
import { Route } from "front-end/lib/app/types";
import * as FormField from "front-end/lib/components/form-field";
import * as NumberField from "front-end/lib/components/form-field/number";
import * as LongText from "front-end/lib/components/form-field/long-text";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as toasts from "front-end/lib/pages/proposal/sprint-with-us/lib/toasts";
import ViewTabHeader from "front-end/lib/pages/proposal/sprint-with-us/lib/views/view-tab-header";
import * as Tab from "front-end/lib/pages/proposal/sprint-with-us/view/tab";
import Accordion from "front-end/lib/views/accordion";
// import { iconLinkSymbol, leftPlacement } from "front-end/lib/views/link";
import { ProposalMarkdown } from "front-end/lib/views/markdown";
import ReportCardList from "front-end/lib/views/report-card-list";
import Separator from "front-end/lib/views/separator";
import React from "react";
import { Alert, Col, Row } from "reactstrap";
import { countWords } from "shared/lib";
import {
  // canSWUOpportunityBeScreenedInToCodeChallenge,
  getQuestionByOrder,
  // hasSWUOpportunityPassedCodeChallenge,
  hasSWUOpportunityPassedTeamQuestions,
  hasSWUOpportunityPassedTeamQuestionsEvaluation,
  SWUOpportunity
} from "shared/lib/resources/opportunity/sprint-with-us";
import {
  NUM_SCORE_DECIMALS,
  SWUProposal,
  SWUProposalStatus,
  // SWUProposalStatus,
  SWUProposalTeamQuestionResponse
} from "shared/lib/resources/proposal/sprint-with-us";
import {
  CreateValidationErrors,
  getEvaluationScoreByOrder,
  SWUTeamQuestionResponseEvaluation,
  SWUTeamQuestionResponseEvaluationScores,
  SWUTeamQuestionResponseEvaluationStatus,
  SWUTeamQuestionResponseEvaluationType,
  UpdateValidationErrors
} from "shared/lib/resources/question-evaluation/sprint-with-us";
import { adt, ADT } from "shared/lib/types";
import { invalid } from "shared/lib/validation";
import {
  validateSWUTeamQuestionResponseEvaluationScoreNotes,
  validateSWUTeamQuestionResponseEvaluationScoreScore
} from "shared/lib/validation/question-evaluation/sprint-with-us";
import { makeStartLoading, makeStopLoading } from "front-end/lib";
import { leftPlacement, iconLinkSymbol } from "front-end/lib/views/link";

interface EvaluationScore {
  score: Immutable<NumberField.State>;
  notes: Immutable<LongText.State>;
}

type ModalId = ADT<"cancelDraft">;

export interface State extends Tab.Params {
  showModal: ModalId | null;
  startEditingLoading: number;
  saveLoading: number;
  screenToFromLoading: number;
  openAccordions: Set<number>;
  evaluationScores: EvaluationScore[];
  isEditing: boolean;
}

export type InnerMsg =
  | ADT<"toggleAccordion", number>
  | ADT<"showModal", ModalId>
  | ADT<"hideModal">
  | ADT<"startEditing">
  | ADT<
      "onStartEditingResponse",
      api.ResponseValidation<SWUTeamQuestionResponseEvaluation, string[]>
    >
  | ADT<"cancelEditing">
  | ADT<"cancel">
  | ADT<"saveDraft">
  | ADT<
      "onSaveDraftResponse",
      api.ResponseValidation<
        SWUTeamQuestionResponseEvaluation,
        CreateValidationErrors
      >
    >
  | ADT<"saveChanges">
  | ADT<
      "onSaveChangesResponse",
      api.ResponseValidation<
        SWUTeamQuestionResponseEvaluation,
        UpdateValidationErrors
      >
    >
  | ADT<"screenIn">
  | ADT<"onScreenInResponse", SWUProposal | null>
  | ADT<"screenOut">
  | ADT<"onScreenOutResponse", SWUProposal | null>
  | ADT<"scoreMsg", { childMsg: NumberField.Msg; rIndex: number }>
  | ADT<"notesMsg", { childMsg: LongText.Msg; rIndex: number }>;

export type Msg = component_.page.Msg<InnerMsg, Route>;

export function getTeamQuestionsOpportunityTab(
  evaluating: boolean,
  panelEvaluations: SWUTeamQuestionResponseEvaluation[]
) {
  return evaluating
    ? panelEvaluations.length
      ? ("consensus" as const)
      : ("overview" as const)
    : ("teamQuestions" as const);
}

function initEvaluationScores(
  opp: SWUOpportunity,
  prop: SWUProposal,
  evaluation?: SWUTeamQuestionResponseEvaluation,
  validate = false
): [EvaluationScore[], component_.Cmd<Msg>[]] {
  return prop.teamQuestionResponses.reduce<
    [EvaluationScore[], component_.Cmd<Msg>[]]
  >(
    ([states, cmds], r, rIndex) => {
      const question = getQuestionByOrder(opp, r.order);
      const score = evaluation
        ? getEvaluationScoreByOrder(evaluation, r.order)
        : null;

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
          value: score?.score ?? null,
          id: `swu-proposal-question-evaluation-score-${rIndex}`
        }
      });
      const [notesState, notesCmds] = LongText.init({
        errors: [],
        validate: validateSWUTeamQuestionResponseEvaluationScoreNotes,
        child: {
          value: score?.notes ?? "",
          id: `swu-proposal-question-evaluation-notes-${rIndex}`
        }
      });

      return [
        [
          ...states,
          validate
            ? {
                score: FormField.validate(immutable(scoreState)),
                notes: FormField.validate(immutable(notesState))
              }
            : { score: immutable(scoreState), notes: immutable(notesState) }
        ],
        [
          ...cmds,
          ...component_.cmd.mapMany(
            scoreCmds,
            (childMsg) =>
              adt("scoreMsg", {
                rIndex,
                childMsg
              }) as Msg
          ),
          ...component_.cmd.mapMany(
            notesCmds,
            (childMsg) =>
              adt("notesMsg", {
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
  const [evaluationScoreStates, evaluationScoreCmds] = initEvaluationScores(
    params.opportunity,
    params.proposal,
    params.questionEvaluation,
    false
  );
  return [
    {
      ...params,
      showModal: null,
      screenToFromLoading: 0,
      saveLoading: 0,
      startEditingLoading: 0,
      openAccordions: new Set(
        params.proposal.teamQuestionResponses.map((p, i) => i)
      ),
      evaluationScores: evaluationScoreStates,
      isEditing: !params.questionEvaluation
    },
    evaluationScoreCmds
  ];
};

const startSaveLoading = makeStartLoading<State>("saveLoading");
const stopSaveLoading = makeStopLoading<State>("saveLoading");
const startStartEditingLoading = makeStartLoading<State>("startEditingLoading");
const stopStartEditingLoading = makeStopLoading<State>("startEditingLoading");

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
      if (state.saveLoading > 0) {
        return [state, []];
      }
      return [state.set("showModal", null), []];
    case "startEditing": {
      const evaluation = state.questionEvaluation;
      if (!evaluation) return [state, []];
      return [
        startStartEditingLoading(state),
        [
          api.evaluations.swu.readOne<Msg>()(evaluation.id, (result) =>
            adt("onStartEditingResponse", result)
          )
        ]
      ];
    }
    case "onStartEditingResponse": {
      const evaluation = state.questionEvaluation;
      if (!evaluation) return [state, []];
      const evaluationResult = msg.value;
      state = stopStartEditingLoading(state);
      if (!api.isValid(evaluationResult)) {
        return [state, []];
      }
      const [evaluationScoreStates, evaluationScoreCmds] = initEvaluationScores(
        state.opportunity,
        state.proposal,
        evaluationResult.value,
        true
      );
      return [
        state
          .set("isEditing", true)
          .set("evaluationScores", evaluationScoreStates),
        evaluationScoreCmds
      ];
    }
    case "cancelEditing": {
      const evaluation = state.evaluationScores;
      if (!evaluation) return [state, []];
      const [evaluationScoreStates, evaluationScoreCmds] = initEvaluationScores(
        state.opportunity,
        state.proposal,
        state.questionEvaluation
      );
      return [
        state
          .set("isEditing", false)
          .set("evaluationScores", evaluationScoreStates),
        evaluationScoreCmds
      ];
    }
    case "cancel":
      return [
        state,
        [
          component_.cmd.dispatch(
            component_.global.newRouteMsg(
              adt("opportunitySWUEdit" as const, {
                opportunityId: state.opportunity.id,
                tab: (() =>
                  getTeamQuestionsOpportunityTab(
                    state.evaluating,
                    state.panelQuestionEvaluations
                  ))()
              })
            )
          )
        ]
      ];
    case "saveDraft": {
      const scores = getValues(state);
      if (scores === null) {
        return [state, []];
      }

      return [
        startSaveLoading(state),
        [
          api.evaluations.swu.create<Msg>()(
            {
              proposal: state.proposal.id,
              type:
                state.proposal.status ===
                SWUProposalStatus.TeamQuestionsPanelIndividual
                  ? SWUTeamQuestionResponseEvaluationType.Individual
                  : SWUTeamQuestionResponseEvaluationType.Consensus,
              status: SWUTeamQuestionResponseEvaluationStatus.Draft,
              scores
            },
            (response) => adt("onSaveDraftResponse", response)
          )
        ]
      ];
    }
    case "onSaveDraftResponse": {
      state = stopSaveLoading(state);
      const result = msg.value;
      switch (result.tag) {
        case "valid": {
          const [evaluationScoreStates, evaluationScoreCmds] =
            initEvaluationScores(
              state.opportunity,
              state.proposal,
              result.value
            );
          return [
            state.set("evaluationScores", evaluationScoreStates),
            [
              ...evaluationScoreCmds,
              component_.cmd.dispatch(
                component_.global.newRouteMsg(
                  adt(
                    result.value.type ===
                      SWUTeamQuestionResponseEvaluationType.Individual
                      ? "questionEvaluationIndividualSWUEdit"
                      : "questionEvaluationConsensusSWUEdit",
                    {
                      proposalId: state.proposal.id,
                      opportunityId: state.proposal.opportunity.id,
                      evaluationId: result.value.id,
                      tab: "teamQuestions" as const
                    }
                  ) as Route
                )
              ),
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("success", toasts.questionEvaluationDraftCreated.success)
                )
              )
            ]
          ];
        }
        case "invalid": {
          let evaluationScores = state.evaluationScores;
          if (result.value) {
            evaluationScores = (result.value.scores ?? []).map((e, i) => ({
              notes: FormField.setErrors(
                evaluationScores[i].notes,
                e.notes || []
              ),
              score: FormField.setErrors(
                evaluationScores[i].score,
                e.score || []
              )
            }));
          }
          return [
            state.set("evaluationScores", evaluationScores),
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("error", toasts.questionEvaluationDraftCreated.error)
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
                  adt("error", toasts.questionEvaluationDraftCreated.error)
                )
              )
            ]
          ];
      }
    }
    case "saveChanges": {
      const scores = getValues(state);
      if (scores === null) {
        return [state, []];
      }

      return [
        startSaveLoading(state),
        state.questionEvaluation
          ? [
              api.evaluations.swu.update<Msg>()(
                state.questionEvaluation.id,
                adt("edit", { scores }),
                (response) => adt("onSaveChangesResponse", response)
              )
            ]
          : []
      ];
    }
    case "onSaveChangesResponse": {
      state = stopSaveLoading(state);
      const result = msg.value;
      switch (result.tag) {
        case "valid": {
          const [evaluationScoreStates, evaluationScoreCmds] =
            initEvaluationScores(
              state.opportunity,
              state.proposal,
              result.value
            );
          return [
            state
              .set("evaluationScores", evaluationScoreStates)
              .set("isEditing", false),
            [
              ...evaluationScoreCmds,
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("success", toasts.questionEvaluationChangesSaved.success)
                )
              )
            ]
          ];
        }
        case "invalid": {
          let evaluationScores = state.evaluationScores;
          if (result.value.evaluation?.tag === "edit") {
            evaluationScores = (result.value.evaluation.value.scores ?? []).map(
              (e, i) => ({
                notes: FormField.setErrors(
                  evaluationScores[i].notes,
                  e.notes || []
                ),
                score: FormField.setErrors(
                  evaluationScores[i].score,
                  e.score || []
                )
              })
            );
          }
          return [
            state.set("evaluationScores", evaluationScores),
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("error", toasts.questionEvaluationChangesSaved.error)
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
                  adt("error", toasts.questionEvaluationChangesSaved.error)
                )
              )
            ]
          ];
      }
    }
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
    case "scoreMsg":
      return component_.base.updateChild({
        state,
        childStatePath: ["evaluationScores", String(msg.value.rIndex), "score"],
        childUpdate: NumberField.update,
        childMsg: msg.value.childMsg,
        mapChildMsg: (value) =>
          adt("scoreMsg", {
            rIndex: msg.value.rIndex,
            childMsg: value
          }) as Msg
      });
    case "notesMsg":
      return component_.base.updateChild({
        state,
        childStatePath: ["evaluationScores", String(msg.value.rIndex), "notes"],
        childUpdate: LongText.update,
        childMsg: msg.value.childMsg,
        mapChildMsg: (value) =>
          adt("notesMsg", {
            rIndex: msg.value.rIndex,
            childMsg: value
          }) as Msg
      });
    default:
      return [state, []];
  }
};

export function getValues(
  state: Immutable<State>
): SWUTeamQuestionResponseEvaluationScores[] {
  return state.proposal.teamQuestionResponses.reduce((acc, r, i) => {
    const field = state.evaluationScores[i];
    const notes = FormField.getValue(field.notes);
    const score = FormField.getValue(field.score);
    acc.push({
      order: r.order,
      score: score ?? 0,
      notes
    });
    return acc;
  }, [] as SWUTeamQuestionResponseEvaluationScores[]);
}

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

// interface TeamQuestionResponseEvalViewProps
//   extends TeamQuestionResponseViewProps {
//   individualScores: EvaluationScore[];
//   consensusScore: EvaluationScore;
// }

// const TeamQuestionsResponseEvalIndividualView: component_.base.View<
// TeamQuestionResponseEvalViewProps
// > = ()

interface TeamQuestionResponseEvalViewProps
  extends Omit<TeamQuestionResponseViewProps, "toggleAccordion"> {
  score: EvaluationScore;
  proposal: SWUProposal;
  dispatch: component_.base.Dispatch<Msg>;
  disabled: boolean;
  // panelEvaluationScores: SWUTeamQuestionResponseEvaluation[]
}

const TeamQuestionResponseEvalView: component_.base.View<
  TeamQuestionResponseEvalViewProps
> = ({
  opportunity,
  response,
  index,
  isOpen,
  className,
  dispatch,
  proposal,
  score,
  disabled
}) => {
  const question = getQuestionByOrder(opportunity, response.order);
  if (!question) {
    return null;
  }
  return (
    <Accordion
      className={className}
      toggle={() => dispatch(adt("toggleAccordion", index))}
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
      <div className="mb-3">
        <ProposalMarkdown box source={response.response || EMPTY_STRING} />
      </div>
      {proposal.status === SWUProposalStatus.TeamQuestionsPanelIndividual ? (
        <Row>
          <Col xs="12">
            <LongText.view
              label="Evaluator Notes"
              extraChildProps={{
                style: { height: "200px" }
              }}
              disabled={disabled}
              state={score.notes}
              dispatch={component_.base.mapDispatch(dispatch, (value) =>
                adt("notesMsg" as const, {
                  childMsg: value,
                  rIndex: index
                })
              )}
            />
          </Col>
          <Col xs="12">
            <NumberField.view
              extraChildProps={{ suffix: "Points" }}
              label="Score"
              hint="hint"
              disabled={disabled}
              state={score.score}
              dispatch={component_.base.mapDispatch(dispatch, (value) =>
                adt("scoreMsg" as const, {
                  childMsg: value,
                  rIndex: index
                })
              )}
            />
          </Col>
        </Row>
      ) : (
        <div />
      )}
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
  const isStartEditingLoading = state.startEditingLoading > 0;
  const isSaveLoading = state.saveLoading > 0;
  const isLoading = isStartEditingLoading || isSaveLoading;
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
                    key={`swu-proposal-team-question-response-evaluation-${i}`}
                    className={i < rs.length - 1 ? "mb-4" : ""}
                    opportunity={state.opportunity}
                    isOpen={state.openAccordions.has(i)}
                    index={i}
                    response={r}
                    score={state.evaluationScores[i]}
                    proposal={state.proposal}
                    dispatch={dispatch}
                    disabled={!state.isEditing || isLoading}
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
  return state.evaluating ? (
    <TeamQuestionResponsesEvalView state={state} dispatch={dispatch} />
  ) : (
    <TeamQuestionResponsesView state={state} dispatch={dispatch} />
  );
};

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view,

  onInitResponse() {
    return component_.page.readyMsg();
  },

  getModal: (state) => {
    if (!state.showModal) {
      return component_.page.modal.hide();
    }
    switch (state.showModal.tag) {
      case "cancelDraft":
        return component_.page.modal.show<Msg>({
          title: "Cancel New Sprint With Us Evaluation?",
          body: () =>
            "Are you sure you want to cancel? Any information you may have entered will be lost if you do so.",
          onCloseMsg: adt("hideModal"),
          actions: [
            {
              text: "Yes, I want to cancel",
              color: "danger",
              msg: adt("cancel"),
              button: true
            },
            {
              text: "Go Back",
              color: "secondary",
              msg: adt("hideModal")
            }
          ]
        });
      case null:
        return component_.page.modal.hide();
    }
  },

  getActions: ({ state, dispatch }) => {
    const proposal = state.proposal;
    const propStatus = proposal.status;
    const isSaveLoading = state.saveLoading > 0;
    const isStartEditingLoading = state.startEditingLoading > 0;
    const isLoading = isSaveLoading || isStartEditingLoading;
    if (state.isEditing && state.questionEvaluation) {
      return component_.page.actions.links([
        {
          children: "Save Changes",
          symbol_: leftPlacement(iconLinkSymbol("save")),
          loading: isSaveLoading,
          disabled: isLoading,
          button: true,
          color: "success",
          onClick: () => dispatch(adt("saveChanges"))
        },
        {
          children: "Cancel",
          color: "c-nav-fg-alt",
          disabled: isLoading,
          onClick: () => dispatch(adt("cancelEditing") as Msg)
        }
      ]);
    }
    switch (propStatus) {
      case SWUProposalStatus.TeamQuestionsPanelIndividual:
        return component_.page.actions.links(
          state.evaluating
            ? state.questionEvaluation
              ? state.questionEvaluation.status ===
                  SWUTeamQuestionResponseEvaluationStatus.Draft &&
                state.questionEvaluation.type ===
                  SWUTeamQuestionResponseEvaluationType.Individual
                ? [
                    {
                      children: "Edit",
                      onClick: () => dispatch(adt("startEditing")),
                      button: true,
                      loading: isStartEditingLoading,
                      disabled: isLoading,
                      symbol_: leftPlacement(iconLinkSymbol("edit")),
                      color: "primary"
                    }
                  ]
                : []
              : [
                  {
                    children: "Save Draft",
                    symbol_: leftPlacement(iconLinkSymbol("save")),
                    loading: isSaveLoading,
                    disabled: isLoading,
                    button: true,
                    color: "success",
                    onClick: () => dispatch(adt("saveDraft"))
                  },
                  {
                    children: "Cancel",
                    color: "c-nav-fg-alt",
                    disabled: isLoading,
                    onClick: () =>
                      dispatch(adt("showModal", adt("cancelDraft")) as Msg)
                  }
                ]
            : []
        );
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
