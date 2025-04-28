import { EMPTY_STRING } from "front-end/config";
import { Route } from "front-end/lib/app/types";
import * as Table from "front-end/lib/components/table";
import {
  immutable,
  Immutable,
  component as component_
} from "front-end/lib/framework";
import * as Tab from "front-end/lib/pages/opportunity/sprint-with-us/edit/tab";
import EditTabHeader from "front-end/lib/pages/opportunity/sprint-with-us/lib/views/edit-tab-header";
import {
  swuProposalStatusToColor,
  swuProposalStatusToTitleCase
} from "front-end/lib/pages/proposal/sprint-with-us/lib";
import Badge from "front-end/lib/views/badge";
import Link, { routeDest } from "front-end/lib/views/link";
import ReportCardList, {
  ReportCard
} from "front-end/lib/views/report-card-list";
import React from "react";
import { Col, Row } from "reactstrap";
import {
  canViewSWUOpportunityProposals,
  hasSWUOpportunityPassedTeamScenario,
  SWUOpportunity
} from "shared/lib/resources/opportunity/sprint-with-us";
import {
  compareSWUProposalsForPublicSector,
  getSWUProponentName,
  isSWUProposalInTeamScenario,
  NUM_SCORE_DECIMALS,
  SWUProposalSlim,
  SWUProposalStatus
} from "shared/lib/resources/proposal/sprint-with-us";
import { ADT, adt } from "shared/lib/types";

export interface State extends Tab.Params {
  opportunity: SWUOpportunity | null;
  proposals: SWUProposalSlim[];
  canViewProposals: boolean;
  table: Immutable<Table.State>;
  proposalSortOrder: "default" | "completePage";
}

export type InnerMsg =
  | ADT<"onInitResponse", Tab.InitResponse>
  | ADT<"table", Table.Msg>;

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
      canViewProposals: false,
      table: immutable(tableState),
      proposalSortOrder: params.proposalSortOrder || "default"
    },
    component_.cmd.mapMany(tableCmds, (msg) => adt("table", msg) as Msg)
  ];
};

const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "onInitResponse": {
      const opportunity = msg.value[0];
      const proposals = msg.value[1];
      const canViewProposals =
        canViewSWUOpportunityProposals(opportunity) &&
        hasSWUOpportunityPassedTeamScenario(opportunity) &&
        !!proposals.length;

      // Filter proposals first
      const filteredProposals = proposals.filter((p) =>
        isSWUProposalInTeamScenario(p)
      );

      // Sort proposals based on the order specified in the state
      let useProposals = filteredProposals;

      if (state.proposalSortOrder === "completePage") {
        useProposals = [...filteredProposals]; // Create a copy of the filtered array
        // Custom sort: Awarded first, Disqualified last, others by scenarioScore
        useProposals.sort((a, b) => {
          const getPriority = (status: SWUProposalStatus): number => {
            if (status === SWUProposalStatus.Awarded) return 0;
            if (status === SWUProposalStatus.Disqualified) return 2;
            return 1; // All others have priority 1
          };
          const priorityA = getPriority(a.status);
          const priorityB = getPriority(b.status);
          if (priorityA !== priorityB) {
            return priorityA - priorityB; // Sort by priority
          } else {
            // Same priority level, use original comparison for this tab
            return compareSWUProposalsForPublicSector(a, b, "scenarioScore");
          }
        });
      } else {
        // Default sort for this tab: Use existing logic (by status group, then scenarioScore)
        useProposals.sort((a, b) =>
          compareSWUProposalsForPublicSector(a, b, "scenarioScore")
        );
      }

      return [
        state
          .set("opportunity", opportunity)
          .set("proposals", useProposals) // Use the filtered and sorted copy
          .set("canViewProposals", canViewProposals),
        [component_.cmd.dispatch(component_.page.readyMsg())]
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

const makeCardData = (
  opportunity: SWUOpportunity,
  proposals: SWUProposalSlim[]
): ReportCard[] => {
  const numProposals = proposals.length;
  const [highestScore, averageScore] = proposals.reduce(
    ([highest, average], { scenarioScore }, i) => {
      if (!scenarioScore) {
        return [highest, average];
      }
      return [
        scenarioScore > highest ? scenarioScore : highest,
        (average * i + scenarioScore) / (i + 1)
      ];
    },
    [0, 0]
  );
  const isComplete = hasSWUOpportunityPassedTeamScenario(opportunity);
  return [
    {
      icon: "users",
      name: `Participant${numProposals === 1 ? "" : "s"}`,
      value: numProposals ? String(numProposals) : EMPTY_STRING
    },
    {
      icon: "star-full",
      iconColor: "c-report-card-icon-highlight",
      name: "Top TS Score",
      value:
        isComplete && highestScore
          ? `${highestScore.toFixed(NUM_SCORE_DECIMALS)}%`
          : EMPTY_STRING
    },
    {
      icon: "star-half",
      iconColor: "c-report-card-icon-highlight",
      name: "Avg. TS Score",
      value:
        isComplete && averageScore
          ? `${averageScore.toFixed(NUM_SCORE_DECIMALS)}%`
          : EMPTY_STRING
    }
  ];
};

const WaitForTeamScenario: component_.base.ComponentView<State, Msg> = () => {
  return (
    <div>
      Participants will be displayed here once the opportunity has reached the
      Team Scenario.
    </div>
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
    tab: "teamScenario" as const
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
  return state.proposals.map((p) => {
    return [
      {
        className: "text-wrap",
        children: (
          <ProponentCell
            proposal={p}
            disabled={false}
            opportunity={opportunity}
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
            {p.scenarioScore
              ? `${p.scenarioScore.toFixed(NUM_SCORE_DECIMALS)}%`
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
      children: "Team Scenario",
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
            <h4 className="mb-0">Team Scenario Participants</h4>
          </Col>
          <Col xs="12">
            {state.canViewProposals && state.proposals.length ? (
              <EvaluationTable {...props} />
            ) : (
              <WaitForTeamScenario {...props} />
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
