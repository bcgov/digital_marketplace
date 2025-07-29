import { EMPTY_STRING } from "front-end/config";
import { Route } from "front-end/lib/app/types";
import * as Table from "front-end/lib/components/table";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as Tab from "front-end/lib/pages/opportunity/team-with-us/edit/tab";
import * as toasts from "front-end/lib/pages/opportunity/team-with-us/lib/toasts";
import EditTabHeader from "front-end/lib/pages/opportunity/team-with-us/lib/views/edit-tab-header";
import Link, {
  iconLinkSymbol,
  leftPlacement,
  routeDest
} from "front-end/lib/views/link";
import ReportCardList, {
  ReportCard
} from "front-end/lib/views/report-card-list";
import React from "react";
import { Badge, Col, Row } from "reactstrap";
import {
  canViewTWUOpportunityResourceQuestionResponseEvaluations,
  hasTWUOpportunityPassedResourceQuestions,
  isTWUOpportunityAcceptingProposals,
  TWUOpportunity,
  TWUOpportunityStatus,
  UpdateValidationErrors
} from "shared/lib/resources/opportunity/team-with-us";
import {
  compareTWUProposalAnonymousProponentNumber,
  getTWUProponentName,
  NUM_SCORE_DECIMALS,
  TWUProposalSlim,
  TWUProposalStatus
} from "shared/lib/resources/proposal/team-with-us";
import {
  TWUResourceQuestionResponseEvaluation,
  TWUResourceQuestionResponseEvaluationStatus
} from "shared/lib/resources/evaluations/team-with-us/resource-questions";
import { ADT, adt } from "shared/lib/types";
import { isValid } from "shared/lib/validation";
import { validateTWUResourceQuestionResponseEvaluationScores } from "shared/lib/validation/evaluations/team-with-us/resource-questions";
import Icon from "front-end/lib/views/icon";

export interface State extends Tab.Params {
  opportunity: TWUOpportunity | null;
  submitLoading: boolean;
  canViewEvaluations: boolean;
  canEvaluationsBeSubmitted: boolean;
  evaluations: TWUResourceQuestionResponseEvaluation[];
  proposals: TWUProposalSlim[];
  table: Immutable<Table.State>;
  isPanelMember: boolean;
}

export type InnerMsg =
  | ADT<"onInitResponse", Tab.InitResponse>
  | ADT<"table", Table.Msg>
  | ADT<"submit">
  | ADT<
      "onSubmitResponse",
      api.ResponseValidation<TWUOpportunity, UpdateValidationErrors>
    >;

export type Msg = component_.page.Msg<InnerMsg, Route>;

const init: component_.base.Init<Tab.Params, State, Msg> = (params) => {
  const [tableState, tableCmds] = Table.init({
    idNamespace: "evaluations-table"
  });
  return [
    {
      ...params,
      opportunity: null,
      submitLoading: false,
      canViewEvaluations: false,
      canEvaluationsBeSubmitted: false,
      areEvaluationsValid: false,
      evaluations: [],
      proposals: [],
      table: immutable(tableState),
      isPanelMember: false
    },
    component_.cmd.mapMany(tableCmds, (msg) => adt("table", msg) as Msg)
  ];
};

const update: component_.page.Update<State, InnerMsg, Route> = ({
  state,
  msg
}) => {
  switch (msg.tag) {
    case "onInitResponse": {
      const opportunity = msg.value[0];
      if (!opportunity) {
        return [state, []];
      }
      const proposals = msg.value[1].sort((a, b) =>
        compareTWUProposalAnonymousProponentNumber(a, b)
      );
      const evaluations = msg.value[2];
      const canViewEvaluations =
        canViewTWUOpportunityResourceQuestionResponseEvaluations(
          opportunity,
          TWUOpportunityStatus.EvaluationResourceQuestionsIndividual
        );
      const isPanelMember =
        opportunity.evaluationPanel?.some(
          ({ user }) => user.id === state.viewerUser.id
        ) ?? false;
      return [
        state
          .set("opportunity", opportunity)
          .set("evaluations", evaluations)
          .set("proposals", proposals)
          .set("canViewEvaluations", canViewEvaluations)
          // Determine whether the "Submit" button should be shown at all.
          // Can be submitted if...
          // - Opportunity has the appropriate status
          // - All questions have been evaluated.
          // - Is the correct user type
          .set(
            "canEvaluationsBeSubmitted",
            opportunity.status ===
              TWUOpportunityStatus.EvaluationResourceQuestionsIndividual &&
              isPanelMember &&
              evaluations.every(
                ({ status }) =>
                  status === TWUResourceQuestionResponseEvaluationStatus.Draft
              )
          )
          .set("isPanelMember", isPanelMember),
        [component_.cmd.dispatch(component_.page.readyMsg())]
      ];
    }

    case "submit": {
      const opportunity = state.opportunity;
      if (!opportunity) return [state, []];
      return [
        state.set("submitLoading", true),
        [
          api.opportunities.twu.update<Msg>()(
            opportunity.id,
            adt("submitIndividualQuestionEvaluations", {
              note: "",
              proposals: state.evaluations.map(({ proposal }) => proposal)
            }),
            (response) => adt("onSubmitResponse", response)
          )
        ]
      ];
    }

    case "onSubmitResponse": {
      const opportunity = state.opportunity;
      if (!opportunity) return [state, []];
      state = state.set("submitLoading", false);
      const result = msg.value;
      if (!api.isValid(result)) {
        return [
          state,
          [
            component_.cmd.dispatch(
              component_.global.showToastMsg(
                adt(
                  "error",
                  toasts.submittedQuestionEvaluationScoresForConsensus.error
                )
              )
            )
          ]
        ];
      }
      return [
        state,
        [
          component_.cmd.dispatch(
            component_.global.showToastMsg(
              adt(
                "success",
                toasts.submittedQuestionEvaluationScoresForConsensus.success
              )
            )
          ),
          component_.cmd.join3(
            api.opportunities.twu.readOne()(opportunity.id, (response) =>
              api.getValidValue(response, opportunity)
            ),
            api.proposals.twu.readMany(opportunity.id)((response) =>
              api
                .getValidValue(response, state.proposals)
                .filter(
                  (proposal) => proposal.status !== TWUProposalStatus.Withdrawn
                )
            ),
            api.opportunities.twu.resourceQuestions.evaluations.readMany(
              opportunity.id
            )((response) => api.getValidValue(response, state.evaluations)),
            (newOpp, newProposals, newEvaluations) =>
              adt("onInitResponse", [
                newOpp,
                newProposals,
                newEvaluations,
                []
              ]) as Msg
          )
        ]
      ];
    }

    case "table":
      return component_.base.updateChild({
        state,
        childStatePath: ["table"],
        childUpdate: Table.update,
        childMsg: msg.value,
        mapChildMsg: (value) => ({ tag: "table", value })
      });

    default:
      return [state, []];
  }
};

const NotAvailable: component_.base.ComponentView<State, Msg> = ({ state }) => {
  const opportunity = state.opportunity;
  if (!opportunity) return null;
  if (isTWUOpportunityAcceptingProposals(opportunity)) {
    return (
      <div>
        Evaluations will be displayed here once this opportunity has closed.
      </div>
    );
  } else {
    return <div>No proposals were submitted to this opportunity.</div>;
  }
};

const ContextMenuCell: component_.base.View<{
  disabled: boolean;
  proposal: TWUProposalSlim;
  evaluation?: TWUResourceQuestionResponseEvaluation;
  isPanelMember: boolean;
  canEvaluationsBeSubmitted: boolean;
}> = ({
  disabled,
  proposal,
  evaluation,
  isPanelMember,
  canEvaluationsBeSubmitted
}) => {
  const proposalRouteParams = {
    proposalId: proposal.id,
    opportunityId: proposal.opportunity.id,
    tab: "resourceQuestions" as const
  };
  return evaluation ? (
    <Link
      disabled={disabled}
      dest={routeDest(
        adt("questionEvaluationIndividualTWUEdit", {
          ...proposalRouteParams,
          userId: evaluation.evaluationPanelMember
        })
      )}>
      {isPanelMember && canEvaluationsBeSubmitted ? "Edit" : "View"}
    </Link>
  ) : (
    <Link
      disabled={disabled}
      dest={routeDest(
        adt("questionEvaluationIndividualTWUCreate", proposalRouteParams)
      )}>
      Start Evaluation
    </Link>
  );
};

interface ProponentCellProps {
  proposal: TWUProposalSlim;
  warn: boolean;
}

const ProponentCell: component_.base.View<ProponentCellProps> = ({
  proposal,
  warn
}) => {
  const iconClassName = "me-2 text-warning flex-shrink-0 flex-grow-0";
  return (
    <span className="a d-inline-flex align-items-center flex-nowrap">
      {warn ? (
        <Icon
          name="exclamation-circle"
          className={iconClassName}
          width={1}
          height={1}
        />
      ) : (
        <div
          style={{
            width: "1rem",
            height: "1rem"
          }}
          className={iconClassName}
        />
      )}
      {getTWUProponentName(proposal)}
    </span>
  );
};

function evaluationTableBodyRows(state: Immutable<State>): Table.BodyRows {
  const opportunity = state.opportunity;
  if (!opportunity) return [];
  const isSubmitLoading = !!state.submitLoading;
  const isLoading = isSubmitLoading;
  return state.proposals.map((p) => {
    const evaluation = state.evaluations.find((e) => e.proposal === p.id);
    const hasScoreBelowMinimum = (
      state.opportunity?.resourceQuestions ?? []
    ).reduce((acc, rq) => {
      const score = evaluation?.scores[rq.order]?.score;
      return (
        acc ||
        Boolean(
          rq.minimumScore && score !== undefined && score < rq.minimumScore
        )
      );
    }, false);
    return [
      {
        className: "text-wrap",
        children: <ProponentCell proposal={p} warn={hasScoreBelowMinimum} />
      },
      ...opportunity.resourceQuestions.map((rq) => {
        const score = evaluation?.scores[rq.order]?.score;
        const scoreBelowMinimum =
          score && rq.minimumScore && score < rq.minimumScore;
        return {
          className: "text-center",
          children: (
            <div>
              {score ? (
                scoreBelowMinimum ? (
                  <Badge
                    pill={true}
                    className="text-danger below-minimum-score">
                    {+score.toFixed(NUM_SCORE_DECIMALS)}
                  </Badge>
                ) : (
                  +score.toFixed(NUM_SCORE_DECIMALS)
                )
              ) : (
                EMPTY_STRING
              )}
            </div>
          )
        };
      }),
      {
        className: "text-center",
        children: (
          <ContextMenuCell
            disabled={isLoading}
            proposal={p}
            evaluation={evaluation}
            isPanelMember={state.isPanelMember}
            canEvaluationsBeSubmitted={state.canEvaluationsBeSubmitted}
          />
        )
      }
    ];
  });
}

function evaluationTableHeadCells(state: Immutable<State>): Table.HeadCells {
  return [
    {
      children: "Participant",
      className: "text-nowrap"
    },
    ...(state.opportunity?.resourceQuestions.map((rq) => ({
      children: `Q${rq.order + 1}`,
      className: "text-nowrap text-center"
    })) ?? []),
    {
      children: "Action",
      className: "text-nowrap text-center"
    }
  ];
}

const ProponentEvaluations: component_.base.ComponentView<State, Msg> = ({
  state,
  dispatch
}) => {
  return (
    <Table.view
      headCells={evaluationTableHeadCells(state)}
      bodyRows={evaluationTableBodyRows(state)}
      state={state.table}
      dispatch={component_.base.mapDispatch(dispatch, (msg) =>
        adt("table" as const, msg)
      )}
    />
  );
};

const makeCardData = (
  opportunity: TWUOpportunity,
  proposals: TWUProposalSlim[]
): ReportCard[] => {
  const numProposals = proposals.length;
  const [highestScore, averageScore] = proposals.reduce(
    ([highest, average], { questionsScore }, i) => {
      if (!questionsScore) {
        return [highest, average];
      }
      return [
        questionsScore > highest ? questionsScore : highest,
        (average * i + questionsScore) / (i + 1)
      ];
    },
    [0, 0]
  );
  const isComplete = hasTWUOpportunityPassedResourceQuestions(opportunity);
  return [
    {
      icon: "users",
      name: `Proponent${numProposals === 1 ? "" : "s"}`,
      value: numProposals ? String(numProposals) : EMPTY_STRING
    },
    {
      icon: "star-full",
      iconColor: "c-report-card-icon-highlight",
      name: "Top TQ Score",
      value:
        isComplete && highestScore
          ? `${highestScore.toFixed(NUM_SCORE_DECIMALS)}%`
          : EMPTY_STRING
    },
    {
      icon: "star-half",
      iconColor: "c-report-card-icon-highlight",
      name: "Avg. TQ Score",
      value:
        isComplete && averageScore
          ? `${averageScore.toFixed(NUM_SCORE_DECIMALS)}%`
          : EMPTY_STRING
    }
  ];
};

const view: component_.page.View<State, InnerMsg, Route> = (props) => {
  const { state } = props;
  const opportunity = state.opportunity;
  if (!opportunity) return null;
  const cardData = makeCardData(opportunity, state.proposals);
  return (
    <div>
      <EditTabHeader opportunity={opportunity} viewerUser={state.viewerUser} />
      <Row className="mt-5">
        <Col xs="12">
          <ReportCardList reportCards={cardData} />
        </Col>
      </Row>
      <div className="border-top mt-5 pt-5">
        <Row>
          <Col
            xs="12"
            className="d-flex flex-column flex-md-row justify-content-md-between align-items-start align-items-md-center mb-4">
            <h4 className="mb-0">Evaluation</h4>
          </Col>
          <Col xs="12">
            {state.canViewEvaluations && state.proposals.length ? (
              <ProponentEvaluations {...props} />
            ) : (
              <NotAvailable {...props} />
            )}
          </Col>
        </Row>
      </div>
    </div>
  );
};

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view,

  onInitResponse(response) {
    return adt("onInitResponse", response);
  },

  getActions: ({ state, dispatch }) => {
    const opportunity = state.opportunity;
    if (!opportunity || !state.canEvaluationsBeSubmitted) {
      return component_.page.actions.none();
    }
    const isLoading = state.submitLoading;
    const areEvaluationsValid =
      state.evaluations.length === state.proposals.length &&
      state.evaluations.reduce(
        (acc, e) =>
          acc &&
          isValid(
            validateTWUResourceQuestionResponseEvaluationScores(
              e.scores,
              opportunity.resourceQuestions
            )
          ),
        true as boolean
      );
    return component_.page.actions.links([
      {
        children: "Submit Scores for Consensus",
        symbol_: leftPlacement(iconLinkSymbol("paper-plane")),
        color: "primary",
        button: true,
        loading: isLoading,
        disabled: (() => {
          return isLoading || !areEvaluationsValid;
        })(),
        onClick: () => dispatch(adt("submit") as Msg)
      }
    ]);
  }
};
