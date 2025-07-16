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
import * as Tab from "front-end/lib/pages/opportunity/team-with-us/edit/tab";
import * as opportunityToasts from "front-end/lib/pages/opportunity/team-with-us/lib/toasts";
import EditTabHeader from "front-end/lib/pages/opportunity/team-with-us/lib/views/edit-tab-header";
import {
  twuProposalStatusToColor,
  twuProposalStatusToTitleCase
} from "front-end/lib/pages/proposal/team-with-us/lib";
import * as proposalToasts from "front-end/lib/pages/proposal/team-with-us/lib/toasts";
import Badge from "front-end/lib/views/badge";
import Link, {
  iconLinkSymbol,
  leftPlacement,
  rightPlacement,
  routeDest
} from "front-end/lib/views/link";
import ReportCardList, {
  ReportCard
} from "front-end/lib/views/report-card-list";
import React from "react";
import { Col, Row } from "reactstrap";
import {
  canTWUOpportunityBeScreenedInToChallenge,
  canViewTWUOpportunityProposals,
  hasTWUOpportunityPassedResourceQuestions,
  isTWUOpportunityAcceptingProposals,
  TWUOpportunity,
  TWUOpportunityStatus,
  UpdateValidationErrors
} from "shared/lib/resources/opportunity/team-with-us";
import {
  canTWUProposalBeScreenedToFromChallenge,
  compareTWUProposalsForPublicSector,
  getTWUProponentName,
  NUM_SCORE_DECIMALS,
  TWUProposalSlim,
  TWUProposalStatus,
  TWUProposal,
  UpdateValidationErrors as ProposalUpdateValidationErrors
} from "shared/lib/resources/proposal/team-with-us";
import { ADT, adt, Id } from "shared/lib/types";

type ModalId = ADT<"completeResourceQuestions">;

export interface State extends Tab.Params {
  opportunity: TWUOpportunity | null;
  proposals: TWUProposalSlim[];
  showModal: ModalId | null;
  completeResourceQuestionsLoading: number;
  screenToFromLoading: Id | null;
  canProposalsBeScreened: boolean;
  canViewProposals: boolean;
  table: Immutable<Table.State>;
}

export type InnerMsg =
  | ADT<"onInitResponse", Tab.InitResponse>
  | ADT<"table", Table.Msg>
  | ADT<"showModal", ModalId>
  | ADT<"hideModal">
  | ADT<"screenInToChallenge", Id>
  | ADT<
      "onScreenInToChallengeResponse",
      api.ResponseValidation<TWUProposal, ProposalUpdateValidationErrors>
    >
  | ADT<"screenOutFromChallenge", Id>
  | ADT<
      "onScreenOutFromChallengeResponse",
      api.ResponseValidation<TWUProposal, ProposalUpdateValidationErrors>
    >
  | ADT<"completeResourceQuestions">
  | ADT<
      "onCompleteResourceQuestions",
      api.ResponseValidation<TWUOpportunity, UpdateValidationErrors>
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
      completeResourceQuestionsLoading: 0,
      screenToFromLoading: null,
      showModal: null,
      canViewProposals: false,
      canProposalsBeScreened: false,
      table: immutable(tableState)
    },
    component_.cmd.mapMany(tableCmds, (msg) => adt("table", msg) as Msg)
  ];
};

const startCompleteResourceQuestionsLoading = makeStartLoading<State>(
  "completeResourceQuestionsLoading"
);
const stopCompleteResourceQuestionsLoading = makeStopLoading<State>(
  "completeResourceQuestionsLoading"
);

const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "onInitResponse": {
      const opportunity = msg.value[0];
      let proposals = msg.value[1];
      const canViewProposals =
        canViewTWUOpportunityProposals(opportunity) && !!proposals.length;
      proposals = proposals.sort((a, b) =>
        compareTWUProposalsForPublicSector(a, b, "questionsScore")
      );

      /**
       * Can be screened in if...
       * - Opportunity has the appropriate status; and
       * - At least one proposal has been evaluated.
       */
      const canProposalsBeScreened =
        canTWUOpportunityBeScreenedInToChallenge(opportunity) &&
        proposals.reduce(
          (acc, p) => acc || canTWUProposalBeScreenedToFromChallenge(p),
          false as boolean
        );
      return [
        state
          .set("opportunity", opportunity)
          .set("proposals", proposals)
          .set("canViewProposals", canViewProposals)
          .set("canProposalsBeScreened", canProposalsBeScreened),
        [component_.cmd.dispatch(component_.page.readyMsg())]
      ];
    }

    // todo: remove this and associated code - not needed any more - the block is deprecated
    case "completeResourceQuestions": {
      const opportunity = state.opportunity;
      if (!opportunity) return [state, []];
      state = state.set("showModal", null);
      return [
        startCompleteResourceQuestionsLoading(state),
        [
          api.opportunities.twu.update<Msg>()(
            opportunity.id,
            adt("startChallenge", ""),
            (response) => adt("onCompleteResourceQuestions", response)
          )
        ]
      ];
    }

    case "onCompleteResourceQuestions": {
      const opportunity = state.opportunity;
      if (!opportunity) return [state, []];
      const result = msg.value;
      if (!api.isValid(result)) {
        return [
          stopCompleteResourceQuestionsLoading(state),
          [
            component_.cmd.dispatch(
              component_.global.showToastMsg(
                adt(
                  "error",
                  opportunityToasts.statusChanged.error(
                    TWUOpportunityStatus.EvaluationChallenge
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
                  TWUOpportunityStatus.EvaluationChallenge
                )
              )
            )
          ),
          component_.cmd.dispatch(
            component_.global.newRouteMsg(
              adt("opportunityTWUEdit", {
                opportunityId: opportunity.id,
                tab: "challenge" as const
              })
            ) as Msg
          )
        ]
      ];
    }

    case "screenInToChallenge": {
      state = state.set("showModal", null);
      return [
        state.set("screenToFromLoading", msg.value),
        [
          api.proposals.twu.update<Msg>()(
            msg.value,
            adt("screenInToChallenge", ""),
            (response) => adt("onScreenInToChallengeResponse", response)
          )
        ]
      ];
    }

    case "onScreenInToChallengeResponse": {
      const opportunity = state.opportunity;
      if (!opportunity) return [state, []];
      state = state.set("screenToFromLoading", null);
      const result = msg.value;
      switch (result.tag) {
        case "valid":
          return [
            state,
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("success", proposalToasts.screenedIn.success)
                )
              ),
              component_.cmd.join(
                api.opportunities.twu.readOne()(opportunity.id, (response) =>
                  api.getValidValue(response, opportunity)
                ),
                api.proposals.twu.readMany(opportunity.id)((response) =>
                  api.getValidValue(response, state.proposals)
                ),
                (newOpp, newProposals) =>
                  adt("onInitResponse", [newOpp, newProposals, [], []]) as Msg
              ) as component_.Cmd<Msg>
            ]
          ];
        case "invalid":
        case "unhandled":
        default:
          return [
            state,
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("error", proposalToasts.screenedIn.error)
                )
              )
            ]
          ];
      }
    }

    case "screenOutFromChallenge": {
      state = state.set("showModal", null);
      return [
        state.set("screenToFromLoading", msg.value),
        [
          api.proposals.twu.update<Msg>()(
            msg.value,
            adt("screenOutFromChallenge", ""),
            (response) => adt("onScreenOutFromChallengeResponse", response)
          )
        ]
      ];
    }

    case "onScreenOutFromChallengeResponse": {
      const opportunity = state.opportunity;
      if (!opportunity) return [state, []];
      state = state.set("screenToFromLoading", null);
      const result = msg.value;
      switch (result.tag) {
        case "valid":
          return [
            state,
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("success", proposalToasts.screenedOut.success)
                )
              ),
              component_.cmd.join(
                api.opportunities.twu.readOne()(opportunity.id, (response) =>
                  api.getValidValue(response, opportunity)
                ),
                api.proposals.twu.readMany(opportunity.id)((response) =>
                  api.getValidValue(response, state.proposals)
                ),
                (newOpp, newProposals) =>
                  adt("onInitResponse", [newOpp, newProposals, [], []]) as Msg
              ) as component_.Cmd<Msg>
            ]
          ];
        case "invalid":
        case "unhandled":
        default:
          return [
            state,
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt("error", proposalToasts.screenedOut.error)
                )
              )
            ]
          ];
      }
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
      name: "Top RQ Score",
      value:
        isComplete && highestScore
          ? `${highestScore.toFixed(NUM_SCORE_DECIMALS)}%`
          : EMPTY_STRING
    },
    {
      icon: "star-half",
      iconColor: "c-report-card-icon-highlight",
      name: "Avg. RQ Score",
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
  if (isTWUOpportunityAcceptingProposals(opportunity)) {
    return (
      <div>
        Proponents will be displayed here once this opportunity has closed.
      </div>
    );
  } else {
    return <div>No proposals were submitted to this opportunity.</div>;
  }
};

const ContextMenuCell: component_.base.View<{
  disabled: boolean;
  loading: boolean;
  proposal: TWUProposalSlim;
  dispatch: component_.base.Dispatch<Msg>;
}> = ({ disabled, loading, proposal, dispatch }) => {
  switch (proposal.status) {
    case TWUProposalStatus.EvaluatedResourceQuestions:
      return (
        <Link
          button
          symbol_={leftPlacement(iconLinkSymbol("stars"))}
          color="info"
          size="sm"
          disabled={disabled || loading}
          loading={loading}
          onClick={() =>
            dispatch(adt("screenInToChallenge" as const, proposal.id))
          }>
          Screen In
        </Link>
      );
    case TWUProposalStatus.UnderReviewChallenge:
      return (
        <Link
          button
          symbol_={leftPlacement(iconLinkSymbol("ban"))}
          color="danger"
          size="sm"
          disabled={disabled || loading}
          loading={loading}
          onClick={() =>
            dispatch(adt("screenOutFromChallenge" as const, proposal.id))
          }>
          Screen Out
        </Link>
      );
    default:
      return null;
  }
};

interface ProponentCellProps {
  proposal: TWUProposalSlim;
  opportunity: TWUOpportunity;
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
    tab: "resourceQuestions" as const
  };
  return (
    <div>
      <Link
        disabled={disabled}
        dest={routeDest(adt("proposalTWUView", proposalRouteParams))}>
        {getTWUProponentName(proposal)}
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

function evaluationTableBodyRows(
  state: Immutable<State>,
  dispatch: component_.base.Dispatch<Msg>
): Table.BodyRows {
  const opportunity = state.opportunity;
  if (!opportunity) return [];
  const isCompleteResourceQuestionsLoading =
    state.completeResourceQuestionsLoading > 0;
  const isScreenToFromLoading = !!state.screenToFromLoading;
  const isLoading = isCompleteResourceQuestionsLoading || isScreenToFromLoading;
  return state.proposals.map((p) => {
    const isProposalLoading = state.screenToFromLoading === p.id;
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
            text={twuProposalStatusToTitleCase(p.status, state.viewerUser.type)}
            color={twuProposalStatusToColor(p.status, state.viewerUser.type)}
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
      },
      ...(state.canProposalsBeScreened
        ? [
            {
              showOnHover: !isProposalLoading,
              className: "text-right text-nowrap",
              children: (
                <ContextMenuCell
                  dispatch={dispatch}
                  proposal={p}
                  disabled={isLoading}
                  loading={isProposalLoading}
                />
              )
            }
          ]
        : [])
    ];
  });
}

function evaluationTableHeadCells(state: Immutable<State>): Table.HeadCells {
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
      children: "Resource Questions",
      className: "text-nowrap text-center",
      style: { width: "0px" }
    },
    ...(state.canProposalsBeScreened
      ? [
          {
            children: "",
            className: "text-nowrap text-right",
            style: { width: "0px" }
          }
        ]
      : [])
  ];
}

const EvaluationTable: component_.base.ComponentView<State, Msg> = ({
  state,
  dispatch
}) => {
  return (
    <Table.view
      headCells={evaluationTableHeadCells(state)}
      bodyRows={evaluationTableBodyRows(state, dispatch)}
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
                  adt("proposalTWUExportAll", {
                    opportunityId: opportunity.id,
                    anonymous: true
                  })
                )}>
                Export All Anonymized Resource Questions
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

  getActions: ({ state, dispatch }) => {
    const opportunity = state.opportunity;
    if (
      !opportunity ||
      !state.canViewProposals ||
      !state.canProposalsBeScreened
    ) {
      return component_.page.actions.none();
    }
    const isCompleteResourceQuestionsLoading =
      state.completeResourceQuestionsLoading > 0;
    const isScreenToFromLoading = !!state.screenToFromLoading;
    const isLoading =
      isCompleteResourceQuestionsLoading || isScreenToFromLoading;
    return component_.page.actions.links([
      {
        children: "Complete Resource Questions",
        symbol_: leftPlacement(iconLinkSymbol("comments-alt")),
        color: "primary",
        button: true,
        loading: isCompleteResourceQuestionsLoading,
        disabled: (() => {
          // At least one proposal already screened in.
          return (
            isLoading ||
            !(
              canTWUOpportunityBeScreenedInToChallenge(opportunity) &&
              state.proposals.reduce(
                (acc, p) =>
                  acc || p.status === TWUProposalStatus.UnderReviewChallenge,
                false as boolean
              )
            )
          );
        })(),
        onClick: () =>
          dispatch(adt("showModal", adt("completeResourceQuestions")) as Msg)
      }
    ]);
  },

  getModal: (state) => {
    if (!state.showModal) {
      return component_.page.modal.hide();
    }
    switch (state.showModal.tag) {
      case "completeResourceQuestions":
        return component_.page.modal.show({
          title: "Complete Resource Questions?",
          onCloseMsg: adt("hideModal") as Msg,
          actions: [
            {
              text: "Complete Resource Questions",
              icon: "comments-alt",
              color: "primary",
              button: true,
              msg: adt("completeResourceQuestions")
            },
            {
              text: "Cancel",
              color: "secondary",
              msg: adt("hideModal")
            }
          ],
          body: () =>
            "Are you sure you want to complete the evaluation of this opportunity's Resource Questions? You will no longer be able to screen proponents in or out of the Challenge."
        });
    }
  }
};
