import { EMPTY_STRING } from "front-end/config";
import { Route } from "front-end/lib/app/types";
import * as Table from "front-end/lib/components/table";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as Tab from "front-end/lib/pages/opportunity/sprint-with-us/edit/tab";
import * as toasts from "front-end/lib/pages/opportunity/sprint-with-us/lib/toasts";
import EditTabHeader from "front-end/lib/pages/opportunity/sprint-with-us/lib/views/edit-tab-header";
import Link, { routeDest } from "front-end/lib/views/link";
import ReportCardList, {
  ReportCard
} from "front-end/lib/views/report-card-list";
import React from "react";
import { Col, Row } from "reactstrap";
import {
  canViewSWUOpportunityTeamQuestionResponseEvaluations,
  isSWUOpportunityAcceptingProposals,
  SWUOpportunity,
  SWUOpportunityStatus
} from "shared/lib/resources/opportunity/sprint-with-us";
import {
  compareSWUProposalAnonymousProponentNumber,
  getSWUProponentName,
  NUM_SCORE_DECIMALS,
  SWUProposalSlim,
  UpdateValidationErrors
} from "shared/lib/resources/proposal/sprint-with-us";
import {
  SWUTeamQuestionResponseEvaluation,
  canSWUTeamQuestionResponseEvaluationBeSubmitted
} from "shared/lib/resources/question-evaluation/sprint-with-us";
import { ADT, adt } from "shared/lib/types";

export interface State extends Tab.Params {
  opportunity: SWUOpportunity | null;
  submitLoading: boolean;
  canEvaluationsBeSubmitted: boolean;
  canViewEvaluations: boolean;
  evaluations: SWUTeamQuestionResponseEvaluation[];
  proposals: SWUProposalSlim[];
  table: Immutable<Table.State>;
}

export type InnerMsg =
  | ADT<"onInitResponse", Tab.InitResponse>
  | ADT<"table", Table.Msg>
  | ADT<"submit">
  | ADT<
      "onSubmitResponse",
      api.ResponseValidation<
        SWUTeamQuestionResponseEvaluation,
        UpdateValidationErrors
      >[]
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
      evaluations: [],
      proposals: [],
      table: immutable(tableState)
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
      const proposals = msg.value[1].sort((a, b) =>
        compareSWUProposalAnonymousProponentNumber(a, b)
      );
      const evaluations = msg.value[2];
      const canViewEvaluations =
        canViewSWUOpportunityTeamQuestionResponseEvaluations(opportunity);
      return [
        state
          .set("opportunity", opportunity)
          .set("evaluations", evaluations)
          .set("proposals", proposals)
          .set("canViewEvaluations", canViewEvaluations)
          // Determine whether the "Submit" button should be shown at all.
          // Can be submitted if...
          // - Opportunity has the appropriate status; and
          // - All questions have been evaluated.
          .set(
            "canEvaluationsBeSubmitted",
            opportunity.status ===
              SWUOpportunityStatus.EvaluationTeamQuestionsPanel &&
              evaluations.reduce(
                (acc, e) =>
                  acc ||
                  canSWUTeamQuestionResponseEvaluationBeSubmitted(
                    e,
                    opportunity
                  ),
                false as boolean
              )
          ),
        [component_.cmd.dispatch(component_.page.readyMsg())]
      ];
    }

    case "submit": {
      const opportunity = state.opportunity;
      if (!opportunity) return [state, []];
      return [
        state.set("submitLoading", true),
        [
          component_.cmd.map(
            component_.cmd.sequence(
              state.evaluations.map(({ id }) =>
                api.evaluations.swu.update<
                  api.ResponseValidation<
                    SWUTeamQuestionResponseEvaluation,
                    UpdateValidationErrors
                  >
                >()(id, adt("submit", ""), (response) => response)
              )
            ),
            (evaluationResponses) =>
              adt("onSubmitResponse", evaluationResponses)
          )
        ]
      ];
    }

    case "onSubmitResponse": {
      const opportunity = state.opportunity;
      if (!opportunity) return [state, []];
      state = state.set("submitLoading", false);
      const result = msg.value;
      if (result.some((e) => e.tag === "valid" || e.tag === "unhandled")) {
        return [
          state,
          [
            component_.cmd.dispatch(
              component_.global.showToastMsg(
                adt(
                  "error",
                  toasts.statusChanged.error(SWUOpportunityStatus.Awarded)
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
                toasts.statusChanged.success(SWUOpportunityStatus.Awarded)
              )
            )
          ),
          component_.cmd.join3(
            api.opportunities.swu.readOne()(opportunity.id, (response) =>
              api.getValidValue(response, opportunity)
            ),
            api.proposals.swu.readMany(opportunity.id)((response) =>
              api.getValidValue(response, state.proposals)
            ),
            api.evaluations.swu.readMany({ opportunityId: opportunity.id })(
              (response) => api.getValidValue(response, state.evaluations)
            ),
            (newOpp, newProposals, newEvaluations) =>
              adt("onInitResponse", [
                newOpp,
                newProposals,
                newEvaluations
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
  if (isSWUOpportunityAcceptingProposals(opportunity)) {
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
  proposal: SWUProposalSlim;
  evaluation?: SWUTeamQuestionResponseEvaluation;
}> = ({ disabled, proposal, evaluation }) => {
  const proposalRouteParams = {
    proposalId: proposal.id,
    opportunityId: proposal.opportunity.id,
    tab: "teamQuestions" as const
  };
  return evaluation ? (
    <Link
      disabled={disabled}
      dest={routeDest(
        adt("questionEvaluationIndividualSWUEdit", {
          ...proposalRouteParams,
          evaluationId: evaluation.id
        })
      )}>
      {evaluation ? "Edit" : "Start Evaluation"}
    </Link>
  ) : (
    <Link
      disabled={disabled}
      dest={routeDest(
        adt("questionEvaluationIndividualSWUCreate", proposalRouteParams)
      )}>
      {evaluation ? "Edit" : "Start Evaluation"}
    </Link>
  );
};

interface ProponentCellProps {
  proposal: SWUProposalSlim;
  opportunity: SWUOpportunity;
  disabled: boolean;
}

const ProponentCell: component_.base.View<ProponentCellProps> = ({
  proposal,
  opportunity,
  disabled
}) => {
  const proposalRouteParams = {
    proposalId: proposal.id,
    opportunityId: opportunity.id,
    tab: "proposal" as const
  };
  return (
    <div>
      <Link
        disabled={disabled}
        dest={routeDest(adt("proposalSWUView", proposalRouteParams))}>
        {getSWUProponentName(proposal)}
      </Link>
      {(() => {
        if (!proposal.organization) {
          return null;
        }
        return (
          <div className="small text-secondary text-uppercase">
            {proposal.anonymousProponentName}
          </div>
        );
      })()}
    </div>
  );
};

function evaluationTableBodyRows(state: Immutable<State>): Table.BodyRows {
  const opportunity = state.opportunity;
  if (!opportunity) return [];
  const issubmitLoading = !!state.submitLoading;
  const isLoading = issubmitLoading;
  return state.proposals.map((p) => {
    const evaluation = state.evaluations.find((e) => e.proposal.id === p.id);
    return [
      {
        className: "text-wrap",
        children: (
          <ProponentCell
            proposal={p}
            opportunity={opportunity}
            disabled={isLoading}
          />
        )
      },
      ...opportunity.teamQuestions.map((tq) => {
        const score = evaluation?.scores[tq.order].score;
        return {
          className: "text-center",
          children: (
            <div>
              {score ? `${score.toFixed(NUM_SCORE_DECIMALS)}%` : EMPTY_STRING}
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
      className: "text-nowrap",
      style: { width: "100%", minWidth: "200px" }
    },
    ...(state.opportunity?.teamQuestions.map((tq) => ({
      children: `Q${tq.order + 1}`,
      className: "text-nowrap text-center",
      style: { width: "0px" }
    })) ?? []),
    {
      children: "Action",
      className: "text-nowrap text-center",
      style: { width: "0px" }
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
  opportunity: SWUOpportunity,
  proposals: SWUProposalSlim[]
): ReportCard[] => {
  const numProposals = opportunity.reporting?.numProposals || 0;
  const [highestScore, averageScore] = proposals.reduce(
    ([highest, average], { totalScore }, i) => {
      if (!totalScore) {
        return [highest, average];
      }
      return [
        totalScore > highest ? totalScore : highest,
        (average * i + totalScore) / (i + 1)
      ];
    },
    [0, 0]
  );
  const isAwarded = opportunity.status === SWUOpportunityStatus.Awarded;
  return [
    {
      icon: "comment-dollar",
      name: `Proposal${numProposals === 1 ? "" : "s"}`,
      value: numProposals ? String(numProposals) : EMPTY_STRING
    },
    {
      icon: "star-full",
      iconColor: "c-report-card-icon-highlight",
      name: "Top Score",
      value:
        isAwarded && highestScore
          ? `${highestScore.toFixed(NUM_SCORE_DECIMALS)}%`
          : EMPTY_STRING
    },
    {
      icon: "star-half",
      iconColor: "c-report-card-icon-highlight",
      name: "Avg. Score",
      value:
        isAwarded && averageScore
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
            <h4 className="mb-0">Overview</h4>
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
  }
};