import { EMPTY_STRING } from "front-end/config";
import { Route } from "front-end/lib/app/types";
import * as Table from "front-end/lib/components/table";
import {
  component as component_,
  immutable,
  Immutable
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import * as Tab from "front-end/lib/pages/opportunity/team-with-us/edit/tab";
import * as toasts from "front-end/lib/pages/opportunity/team-with-us/lib/toasts";
import EditTabHeader from "front-end/lib/pages/opportunity/team-with-us/lib/views/edit-tab-header";
import {
  twuProposalStatusToColor,
  twuProposalStatusToTitleCase
} from "front-end/lib/pages/proposal/team-with-us/lib";
import Badge from "front-end/lib/views/badge";
import Link, {
  iconLinkSymbol,
  leftPlacement,
  rightPlacement,
  routeDest
} from "front-end/lib/views/link";
import {
  ReportCard,
  ReportCardList
} from "front-end/lib/views/report-card-list";
import React from "react";
import { Col, Row } from "reactstrap";
import {
  canTWUOpportunityBeAwarded,
  canViewTWUOpportunityProposals,
  isTWUOpportunityAcceptingProposals,
  TWUOpportunity,
  TWUOpportunityStatus
} from "shared/lib/resources/opportunity/team-with-us";
import {
  canTWUProposalBeAwarded,
  compareTWUProposalsForPublicSector,
  getTWUProponentName,
  NUM_SCORE_DECIMALS,
  TWUProposal,
  TWUProposalSlim,
  TWUProposalStatus,
  UpdateValidationErrors
} from "shared/lib/resources/proposal/team-with-us";
import { ADT, adt, Id } from "shared/lib/types";

type ModalId = ADT<"award", Id>;

export interface State extends Tab.Params {
  opportunity: TWUOpportunity | null;
  showModal: ModalId | null;
  awardLoading: Id | null;
  canProposalsBeAwarded: boolean;
  canViewProposals: boolean;
  proposals: TWUProposalSlim[];
  table: Immutable<Table.State>;
}

export type InnerMsg =
  | ADT<"onInitResponse", Tab.InitResponse>
  | ADT<"table", Table.Msg>
  | ADT<"showModal", ModalId>
  | ADT<"hideModal">
  | ADT<"award", Id>
  | ADT<
      "onAwardResponse",
      api.ResponseValidation<TWUProposal, UpdateValidationErrors>
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
      awardLoading: null,
      showModal: null,
      canViewProposals: false,
      canProposalsBeAwarded: false,
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
      let proposals = msg.value[1];
      proposals = proposals.sort((a, b) =>
        compareTWUProposalsForPublicSector(a, b, "totalScore")
      );
      const canViewProposals =
        canViewTWUOpportunityProposals(opportunity) && !!proposals.length;

      return [
        state
          .set("opportunity", opportunity)
          .set("proposals", proposals)
          .set("canViewProposals", canViewProposals)
          /**
           * Determine whether the "Award" button should be shown at all.
           * Can be awarded if...
           * - Opportunity has the appropriate status; and
           * - At least one proposal can be awarded.
           */
          .set(
            "canProposalsBeAwarded",
            canTWUOpportunityBeAwarded(opportunity) &&
              proposals.reduce(
                (acc, p) => acc || canTWUProposalBeAwarded(p),
                false as boolean
              )
          ),
        [component_.cmd.dispatch(component_.page.readyMsg())]
      ];
    }
    case "award": {
      const opportunity = state.opportunity;
      if (!opportunity) return [state, []];
      state = state.set("showModal", null);
      return [
        state.set("awardLoading", msg.value),
        [
          api.proposals.twu.update<Msg>()(
            msg.value,
            adt("award", ""),
            (response) => adt("onAwardResponse", response) as Msg
          )
        ]
      ];
    }

    case "onAwardResponse": {
      const opportunity = state.opportunity;
      if (!opportunity) return [state, []];
      state = state.set("awardLoading", null);
      const result = msg.value;
      switch (result.tag) {
        case "valid":
          return [
            state,
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt(
                    "success",
                    toasts.statusChanged.success(TWUOpportunityStatus.Awarded)
                  )
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
              )
            ]
          ];
        case "invalid":
        case "unhandled":
          return [
            state,
            [
              component_.cmd.dispatch(
                component_.global.showToastMsg(
                  adt(
                    "error",
                    toasts.statusChanged.error(TWUOpportunityStatus.Awarded)
                  )
                )
              )
            ]
          ];
      }
      break;
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

/**
 * Displays three 'Cards' at the top of the Proposal tab (opportunity page) which summarizes
 * the number of proposals, the winning score and average score
 *
 * @param opportunity
 * @param proposals
 */
const makeCardData = (
  opportunity: TWUOpportunity,
  proposals: TWUProposalSlim[]
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
  const isAwarded = opportunity.status === TWUOpportunityStatus.Awarded;
  return [
    {
      icon: "comment-dollar",
      name: `Proposal${numProposals === 1 ? "" : "s"}`,
      value: numProposals ? String(numProposals) : EMPTY_STRING
    },
    {
      icon: "star-full",
      iconColor: "c-report-card-icon-highlight",
      name: "Winning Score",
      value: isAwarded && highestScore ? `${highestScore}%` : EMPTY_STRING
    },
    {
      icon: "star-half",
      iconColor: "c-report-card-icon-highlight",
      name: "Avg. Score",
      value: isAwarded && averageScore ? `${averageScore}%` : EMPTY_STRING
    }
  ];
};

/**
 * Displays a terse message in one of two scenarios; the opportunity has NOT closed
 * or no proposals were submitted.
 *
 * @param state
 * @constructor
 */
const NotAvailable: component_.base.ComponentView<State, Msg> = ({ state }) => {
  const opportunity = state.opportunity;
  if (!opportunity) return null;
  if (isTWUOpportunityAcceptingProposals(opportunity)) {
    return (
      <div>
        Proposals will be displayed here once this opportunity has closed.
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
    case TWUProposalStatus.EvaluatedChallenge:
    case TWUProposalStatus.NotAwarded:
      return (
        <Link
          button
          symbol_={leftPlacement(iconLinkSymbol("award"))}
          color="primary"
          size="sm"
          disabled={disabled || loading}
          loading={loading}
          onClick={() =>
            dispatch(adt("showModal", adt("award" as const, proposal.id)))
          }>
          Award
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
    tab: "proposal" as const
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
  const isLoading = !!state.awardLoading;
  return state.proposals.map((p) => {
    const isProposalLoading = state.awardLoading === p.id;
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
      {
        className: "text-center",
        children: (
          <div>
            {p.challengeScore
              ? `${p.challengeScore.toFixed(NUM_SCORE_DECIMALS)}%`
              : EMPTY_STRING}
          </div>
        )
      },
      {
        className: "text-center",
        children: (
          <div>
            {p.priceScore
              ? `${p.priceScore.toFixed(NUM_SCORE_DECIMALS)}%`
              : EMPTY_STRING}
          </div>
        )
      },
      {
        className: "text-center",
        children: (
          <div>
            {p.totalScore
              ? `${p.totalScore.toFixed(NUM_SCORE_DECIMALS)}%`
              : EMPTY_STRING}
          </div>
        )
      },
      ...(state.canProposalsBeAwarded
        ? [
            {
              showOnHover: !isProposalLoading,
              className: "text-end text-nowrap",
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
      className: "text-wrap",
      style: { width: "100%", minWidth: "240px" }
    },
    {
      children: "Status",
      className: "text-nowrap",
      style: { width: "0px" }
    },
    {
      children: "RQ",
      className: "text-nowrap text-center",
      style: { width: "0px" }
    },
    {
      children: "In/Ch",
      className: "text-nowrap text-center",
      style: { width: "0px" }
    },
    {
      children: "Price",
      className: "text-nowrap text-center",
      style: { width: "0px" }
    },
    {
      children: "Total",
      className: "text-nowrap text-center",
      style: { width: "0px" }
    },
    ...(state.canProposalsBeAwarded
      ? [
          {
            children: "",
            className: "text-nowrap text-end",
            style: { width: "0px" }
          }
        ]
      : [])
  ];
}

const Scoresheet: component_.base.ComponentView<State, Msg> = ({
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
            <h4 className="mb-0">Proposals</h4>
            {state.canViewProposals ? (
              <Link
                newTab
                color="info"
                className="mt-3 mt-md-0"
                symbol_={rightPlacement(iconLinkSymbol("file-export"))}
                dest={routeDest(
                  adt("proposalTWUExportAll", {
                    opportunityId: opportunity.id,
                    anonymous: false
                  })
                )}>
                Export All Proposals
              </Link>
            ) : null}
          </Col>
          <Col xs="12">
            {state.canViewProposals ? (
              <Scoresheet {...props} />
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
    const opportunity = state.opportunity;
    if (!opportunity || !state.showModal) {
      return component_.page.modal.hide();
    }
    switch (state.showModal.tag) {
      case "award":
        return component_.page.modal.show({
          title: "Award Team With Us Opportunity?",
          onCloseMsg: adt("hideModal"),
          actions: [
            {
              text: "Award Opportunity",
              icon: "award",
              color: "primary",
              button: true,
              msg: adt("award", state.showModal.value)
            },
            {
              text: "Cancel",
              color: "secondary",
              msg: adt("hideModal")
            } as component_.page.modal.Action<Msg>
          ],
          body: () =>
            "Are you sure you want to award this opportunity to this vendor? Once awarded, all subscribers and vendors with submitted proposals will be notified accordingly."
        });
    }
  }
};
