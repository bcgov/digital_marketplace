import { EMPTY_STRING } from "front-end/config";
import { Route } from "front-end/lib/app/types";
import * as Table from "front-end/lib/components/table";
import {
  immutable,
  Immutable,
  component as component_
} from "front-end/lib/framework";
import * as Tab from "front-end/lib/pages/opportunity/team-with-us/edit/tab";
import EditTabHeader from "front-end/lib/pages/opportunity/team-with-us/lib/views/edit-tab-header";
import {
  twuProposalStatusToColor,
  twuProposalStatusToTitleCase
} from "front-end/lib/pages/proposal/team-with-us/lib";
import Badge from "front-end/lib/views/badge";
import Link, { routeDest } from "front-end/lib/views/link";
import ReportCardList, {
  ReportCard
} from "front-end/lib/views/report-card-list";
import React from "react";
import { Col, Row } from "reactstrap";
import {
  canViewTWUOpportunityProposals,
  hasTWUOpportunityPassedChallenge,
  TWUOpportunity
} from "shared/lib/resources/opportunity/team-with-us";
import {
  compareTWUProposalsForPublicSector,
  getTWUProponentName,
  isTWUProposalInChallenge,
  NUM_SCORE_DECIMALS,
  TWUProposalSlim
} from "shared/lib/resources/proposal/team-with-us";
import { ADT, adt } from "shared/lib/types";

export interface State extends Tab.Params {
  opportunity: TWUOpportunity | null;
  proposals: TWUProposalSlim[];
  canViewProposals: boolean;
  table: Immutable<Table.State>;
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
      completeChallengeLoading: 0,
      screenToFromLoading: null,
      showModal: null,
      canViewProposals: false,
      canProposalsBeScreened: false,
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
      const canViewProposals =
        canViewTWUOpportunityProposals(opportunity) &&
        hasTWUOpportunityPassedChallenge(opportunity) &&
        !!proposals.length;
      proposals = proposals
        .filter((p) => isTWUProposalInChallenge(p))
        .sort((a, b) =>
          compareTWUProposalsForPublicSector(a, b, "challengeScore")
        );
      return [
        state
          .set("opportunity", opportunity)
          .set("proposals", proposals)
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
  opportunity: TWUOpportunity,
  proposals: TWUProposalSlim[]
): ReportCard[] => {
  const numProposals = proposals.length;
  const [highestScore, averageScore] = proposals.reduce(
    ([highest, average], { challengeScore }, i) => {
      if (!challengeScore) {
        return [highest, average];
      }
      return [
        challengeScore > highest ? challengeScore : highest,
        (average * i + challengeScore) / (i + 1)
      ];
    },
    [0, 0]
  );
  const isComplete = hasTWUOpportunityPassedChallenge(opportunity);
  return [
    {
      icon: "users",
      name: `Participant${numProposals === 1 ? "" : "s"}`,
      value: numProposals ? String(numProposals) : EMPTY_STRING
    },
    {
      icon: "star-full",
      iconColor: "c-report-card-icon-highlight",
      name: "Top In/Ch Score",
      value:
        isComplete && highestScore
          ? `${highestScore.toFixed(NUM_SCORE_DECIMALS)}%`
          : EMPTY_STRING
    },
    {
      icon: "star-half",
      iconColor: "c-report-card-icon-highlight",
      name: "Avg. In/Ch Score",
      value:
        isComplete && averageScore
          ? `${averageScore.toFixed(NUM_SCORE_DECIMALS)}%`
          : EMPTY_STRING
    }
  ];
};

const WaitForChallenge: component_.base.ComponentView<State, Msg> = () => {
  return (
    <div>
      Participants will be displayed here once this opportunity has reached the
      Interview/Challenge.
    </div>
  );
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
    tab: "challenge" as const
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
            text={twuProposalStatusToTitleCase(p.status, state.viewerUser.type)}
            color={twuProposalStatusToColor(p.status, state.viewerUser.type)}
          />
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
      children: "Challenge",
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
            <h4 className="mb-0">Interview/Challenge Participants</h4>
          </Col>
          <Col xs="12">
            {state.canViewProposals && state.proposals.length ? (
              <EvaluationTable {...props} />
            ) : (
              <WaitForChallenge {...props} />
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
