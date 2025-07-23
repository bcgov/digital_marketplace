import { EMPTY_STRING } from "front-end/config";
import { makeStartLoading, makeStopLoading } from "front-end/lib";
import { Route } from "front-end/lib/app/types";
import * as Table from "front-end/lib/components/table";
import {
  immutable,
  Immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as Tab from "front-end/lib/pages/opportunity/sprint-with-us/edit/tab";
import * as opportunityToasts from "front-end/lib/pages/opportunity/sprint-with-us/lib/toasts";
import EditTabHeader from "front-end/lib/pages/opportunity/sprint-with-us/lib/views/edit-tab-header";
import {
  swuProposalStatusToColor,
  swuProposalStatusToTitleCase
} from "front-end/lib/pages/proposal/sprint-with-us/lib";
import Badge from "front-end/lib/views/badge";
import Link, {
  iconLinkSymbol,
  rightPlacement,
  routeDest
} from "front-end/lib/views/link";
import ReportCardList, {
  ReportCard
} from "front-end/lib/views/report-card-list";
import React from "react";
import { Col, Row } from "reactstrap";
import {
  canViewSWUOpportunityProposals,
  hasSWUOpportunityPassedTeamQuestions,
  isSWUOpportunityAcceptingProposals,
  SWUOpportunity,
  SWUOpportunityStatus,
  UpdateValidationErrors
} from "shared/lib/resources/opportunity/sprint-with-us";
import {
  compareSWUProposalsForPublicSector,
  getSWUProponentName,
  NUM_SCORE_DECIMALS,
  SWUProposalSlim
} from "shared/lib/resources/proposal/sprint-with-us";
import { ADT, adt } from "shared/lib/types";

type ModalId = ADT<"completeTeamQuestions">;

export interface State extends Tab.Params {
  opportunity: SWUOpportunity | null;
  proposals: SWUProposalSlim[];
  showModal: ModalId | null;
  completeTeamQuestionsLoading: number;
  canViewProposals: boolean;
  table: Immutable<Table.State>;
}

export type InnerMsg =
  | ADT<"onInitResponse", Tab.InitResponse>
  | ADT<"table", Table.Msg>
  | ADT<"showModal", ModalId>
  | ADT<"hideModal">
  | ADT<"completeTeamQuestions">
  | ADT<
      "onCompleteTeamQuestions",
      api.ResponseValidation<SWUOpportunity, UpdateValidationErrors>
    >;

export type Msg = component_.page.Msg<InnerMsg, Route>;

const init: component_.base.Init<Tab.Params, State, Msg> = (params) => {
  const [tableState, tableCmds] = Table.init({
    idNamespace: "proposal-table"
  });
  return [
    {
      ...params,
      opportunity: null,
      proposals: [],
      completeTeamQuestionsLoading: 0,
      showModal: null,
      canViewProposals: false,
      table: immutable(tableState)
    },
    component_.cmd.mapMany(tableCmds, (msg) => adt("table", msg) as Msg)
  ];
};

const startCompleteTeamQuestionsLoading = makeStartLoading<State>(
  "completeTeamQuestionsLoading"
);
const stopCompleteTeamQuestionsLoading = makeStopLoading<State>(
  "completeTeamQuestionsLoading"
);

const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "onInitResponse": {
      const opportunity = msg.value[0];
      let proposals = msg.value[1];
      const canViewProposals =
        canViewSWUOpportunityProposals(opportunity) && !!proposals.length;
      proposals = proposals.sort((a, b) =>
        compareSWUProposalsForPublicSector(a, b, "questionsScore")
      );
      return [
        state
          .set("opportunity", opportunity)
          .set("proposals", proposals)
          .set("canViewProposals", canViewProposals),
        [component_.cmd.dispatch(component_.page.readyMsg())]
      ];
    }
    // todo: remove this and associated code - not needed any more - the block is deprecated
    case "completeTeamQuestions": {
      const opportunity = state.opportunity;
      if (!opportunity) return [state, []];
      state = state.set("showModal", null);
      return [
        startCompleteTeamQuestionsLoading(state),
        [
          api.opportunities.swu.update<Msg>()(
            opportunity.id,
            adt("startCodeChallenge", ""),
            (response) => adt("onCompleteTeamQuestions", response)
          )
        ]
      ];
    }

    case "onCompleteTeamQuestions": {
      const opportunity = state.opportunity;
      if (!opportunity) return [state, []];
      const result = msg.value;
      if (!api.isValid(result)) {
        return [
          stopCompleteTeamQuestionsLoading(state),
          [
            component_.cmd.dispatch(
              component_.global.showToastMsg(
                adt(
                  "error",
                  opportunityToasts.statusChanged.error(
                    SWUOpportunityStatus.EvaluationCodeChallenge
                  )
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
                opportunityToasts.statusChanged.success(
                  SWUOpportunityStatus.EvaluationCodeChallenge
                )
              )
            )
          ),
          component_.cmd.dispatch(
            component_.global.newRouteMsg(
              adt("opportunitySWUEdit", {
                opportunityId: opportunity.id,
                tab: "codeChallenge" as const
              })
            ) as Msg
          )
        ]
      ];
    }

    case "showModal":
      return [state.set("showModal", msg.value), []];

    case "hideModal":
      return [state.set("showModal", null), []];

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

const makeCardData = (
  opportunity: SWUOpportunity,
  proposals: SWUProposalSlim[]
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
  const isComplete = hasSWUOpportunityPassedTeamQuestions(opportunity);
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

const NotAvailable: component_.base.ComponentView<State, Msg> = ({ state }) => {
  const opportunity = state.opportunity;
  if (!opportunity) return null;
  if (isSWUOpportunityAcceptingProposals(opportunity)) {
    return (
      <div>
        Proponents will be displayed here once this opportunity has closed.
      </div>
    );
  } else {
    return <div>No proposals were submitted to this opportunity.</div>;
  }
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
    tab: "teamQuestions" as const
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
  const isCompleteTeamQuestionsLoading = state.completeTeamQuestionsLoading > 0;
  const isLoading = isCompleteTeamQuestionsLoading;
  return state.proposals.map((p) => {
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
      {
        children: (
          <Badge
            text={swuProposalStatusToTitleCase(p.status, state.viewerUser.type)}
            color={swuProposalStatusToColor(p.status, state.viewerUser.type)}
          />
        )
      },
      {
        className: "text-center",
        children: (
          <div>
            {p.questionsScore
              ? `${p.questionsScore.toFixed(NUM_SCORE_DECIMALS)}%`
              : EMPTY_STRING}
          </div>
        )
      }
    ];
  });
}

function evaluationTableHeadCells(): Table.HeadCells {
  return [
    {
      children: "Proponent",
      className: "text-nowrap",
      style: { width: "100%", minWidth: "240px" }
    },
    {
      children: "Status",
      className: "text-nowrap",
      style: { width: "0px" }
    },
    {
      children: "Team Questions",
      className: "text-nowrap text-center",
      style: { width: "0px" }
    }
  ];
}

const EvaluationTable: component_.base.ComponentView<State, Msg> = ({
  state,
  dispatch
}) => {
  return (
    <Table.view
      headCells={evaluationTableHeadCells()}
      bodyRows={evaluationTableBodyRows(state)}
      state={state.table}
      dispatch={component_.base.mapDispatch(dispatch, (msg) =>
        adt("table" as const, msg)
      )}
    />
  );
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
            <h4 className="mb-0">Proponents</h4>
            {state.canViewProposals ? (
              <Link
                newTab
                color="info"
                className="mt-3 mt-md-0"
                symbol_={rightPlacement(iconLinkSymbol("file-export"))}
                dest={routeDest(
                  adt("proposalSWUExportAll", {
                    opportunityId: opportunity.id,
                    anonymous: true
                  })
                )}>
                Export All Anonymized Team Questions
              </Link>
            ) : null}
          </Col>
          <Col xs="12">
            {state.canViewProposals && state.proposals.length ? (
              <EvaluationTable {...props} />
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

  getModal: (state) => {
    if (!state.showModal) {
      return component_.page.modal.hide();
    }
    switch (state.showModal.tag) {
      case "completeTeamQuestions":
        return component_.page.modal.show({
          title: "Complete Team Questions?",
          onCloseMsg: adt("hideModal") as Msg,
          actions: [
            {
              text: "Complete Team Questions",
              icon: "comments-alt",
              color: "primary",
              button: true,
              msg: adt("completeTeamQuestions")
            },
            {
              text: "Cancel",
              color: "secondary",
              msg: adt("hideModal")
            }
          ],
          body: () =>
            "Are you sure you want to complete the evaluation of this opportunity's Team Questions? You will no longer be able to screen proponents in or out of the Code Challenge."
        });
    }
  }
};
