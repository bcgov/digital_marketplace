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
import * as proposalToasts from "front-end/lib/pages/proposal/sprint-with-us/lib/toasts";
import Badge from "front-end/lib/views/badge";
import Link, {
  iconLinkSymbol,
  leftPlacement,
  routeDest
} from "front-end/lib/views/link";
import ReportCardList, {
  ReportCard
} from "front-end/lib/views/report-card-list";
import React from "react";
import { Col, Row } from "reactstrap";
import {
  canSWUOpportunityBeScreenedInToTeamScenario,
  canViewSWUOpportunityProposals,
  hasSWUOpportunityPassedCodeChallenge,
  SWUOpportunity,
  SWUOpportunityStatus,
  UpdateValidationErrors
} from "shared/lib/resources/opportunity/sprint-with-us";
import {
  canSWUProposalBeScreenedToFromTeamScenario,
  compareSWUProposalsForPublicSector,
  getSWUProponentName,
  isSWUProposalInCodeChallenge,
  NUM_SCORE_DECIMALS,
  SWUProposalSlim,
  SWUProposal,
  SWUProposalStatus,
  UpdateValidationErrors as ProposalUpdateValidationErrors
} from "shared/lib/resources/proposal/sprint-with-us";
import { ADT, adt, Id } from "shared/lib/types";

type ModalId = ADT<"completeCodeChallenge">;

export interface State extends Tab.Params {
  opportunity: SWUOpportunity | null;
  proposals: SWUProposalSlim[];
  showModal: ModalId | null;
  completeCodeChallengeLoading: number;
  screenToFromLoading: Id | null;
  canProposalsBeScreened: boolean;
  canViewProposals: boolean;
  allProposalsScored: boolean;
  table: Immutable<Table.State>;
}

export type InnerMsg =
  | ADT<"onInitResponse", Tab.InitResponse>
  | ADT<"table", Table.Msg>
  | ADT<"showModal", ModalId>
  | ADT<"hideModal">
  | ADT<"screenInToTeamScenario", Id>
  | ADT<
      "onScreenInToTeamScenarioResponse",
      api.ResponseValidation<SWUProposal, ProposalUpdateValidationErrors>
    >
  | ADT<"screenOutFromTeamScenario", Id>
  | ADT<
      "onScreenOutFromTeamScenarioResponse",
      api.ResponseValidation<SWUProposal, ProposalUpdateValidationErrors>
    >
  | ADT<"completeCodeChallenge">
  | ADT<
      "onCompleteCodeChallenge",
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
      completeCodeChallengeLoading: 0,
      screenToFromLoading: null,
      showModal: null,
      canViewProposals: false,
      canProposalsBeScreened: false,
      allProposalsScored: false,
      table: immutable(tableState)
    },
    component_.cmd.mapMany(tableCmds, (msg) => adt("table", msg) as Msg)
  ];
};

const startCompleteCodeChallengeLoading = makeStartLoading<State>(
  "completeCodeChallengeLoading"
);
const stopCompleteCodeChallengeLoading = makeStopLoading<State>(
  "completeCodeChallengeLoading"
);

const update: component_.page.Update<State, InnerMsg, Route> = ({
  state,
  msg
}) => {
  switch (msg.tag) {
    case "onInitResponse": {
      const opportunity = msg.value[0];
      let proposals = msg.value[1];
      const canViewProposals =
        canViewSWUOpportunityProposals(opportunity) &&
        hasSWUOpportunityPassedCodeChallenge(opportunity) &&
        !!proposals.length;
      proposals = proposals
        .filter((p) => isSWUProposalInCodeChallenge(p))
        .sort((a, b) =>
          compareSWUProposalsForPublicSector(a, b, "challengeScore")
        );
      // Can be screened in if...
      // - Opportunity has the appropriate status; and
      // - At least one proposal has been evaluated.
      const canProposalsBeScreened =
        canSWUOpportunityBeScreenedInToTeamScenario(opportunity) &&
        proposals.reduce(
          (acc, p) => acc || canSWUProposalBeScreenedToFromTeamScenario(p),
          false as boolean
        );

      /**
       * Check if all proposals have been scored for code challenge
       * or are disqualified (which means they don't need to be scored)
       */
      const allProposalsScored =
        proposals.length > 0 &&
        proposals.every(
          (p) =>
            p.challengeScore !== undefined ||
            p.status === SWUProposalStatus.Disqualified
        );

      return [
        state
          .set("opportunity", opportunity)
          .set("proposals", proposals)
          .set("canViewProposals", canViewProposals)
          .set("canProposalsBeScreened", canProposalsBeScreened)
          .set("allProposalsScored", allProposalsScored),
        [component_.cmd.dispatch(component_.page.readyMsg())]
      ];
    }

    case "completeCodeChallenge": {
      const opportunity = state.opportunity;
      if (!opportunity) return [state, []];
      state = state.set("showModal", null);
      return [
        startCompleteCodeChallengeLoading(state),
        [
          api.opportunities.swu.update<Msg>()(
            opportunity.id,
            adt("startTeamScenario", ""),
            (response) => adt("onCompleteCodeChallenge", response)
          )
        ]
      ];
    }

    case "onCompleteCodeChallenge": {
      const opportunity = state.opportunity;
      if (!opportunity) return [state, []];
      const result = msg.value;
      if (!api.isValid(result)) {
        return [
          stopCompleteCodeChallengeLoading(state),
          [
            component_.cmd.dispatch(
              component_.global.showToastMsg(
                adt(
                  "error",
                  opportunityToasts.statusChanged.error(
                    SWUOpportunityStatus.EvaluationTeamScenario
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
                  SWUOpportunityStatus.EvaluationTeamScenario
                )
              )
            )
          ),
          component_.cmd.dispatch(
            component_.global.newRouteMsg(
              adt("opportunitySWUEdit", {
                opportunityId: opportunity.id,
                tab: "teamScenario" as const
              })
            ) as Msg
          )
        ]
      ];
    }

    case "screenInToTeamScenario": {
      state = state.set("showModal", null);
      return [
        state.set("screenToFromLoading", msg.value),
        [
          api.proposals.swu.update<Msg>()(
            msg.value,
            adt("screenInToTeamScenario", ""),
            (response) => adt("onScreenInToTeamScenarioResponse", response)
          )
        ]
      ];
    }

    case "onScreenInToTeamScenarioResponse": {
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
                api.opportunities.swu.readOne()(opportunity.id, (response) =>
                  api.getValidValue(response, opportunity)
                ),
                api.proposals.swu.readMany(opportunity.id)((response) =>
                  api.getValidValue(response, state.proposals)
                ),
                (newOpp, newProposals) =>
                  adt("onInitResponse", [newOpp, newProposals, [], []]) as Msg
              )
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

    case "screenOutFromTeamScenario": {
      state = state.set("showModal", null);
      return [
        state.set("screenToFromLoading", msg.value),
        [
          api.proposals.swu.update<Msg>()(
            msg.value,
            adt("screenOutFromTeamScenario", ""),
            (response) => adt("onScreenOutFromTeamScenarioResponse", response)
          )
        ]
      ];
    }

    case "onScreenOutFromTeamScenarioResponse": {
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
                api.opportunities.swu.readOne()(opportunity.id, (response) =>
                  api.getValidValue(response, opportunity)
                ),
                api.proposals.swu.readMany(opportunity.id)((response) =>
                  api.getValidValue(response, state.proposals)
                ),
                (newOpp, newProposals) =>
                  adt("onInitResponse", [newOpp, newProposals, [], []]) as Msg
              )
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
  opportunity: SWUOpportunity,
  proposals: SWUProposalSlim[]
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
  const isComplete = hasSWUOpportunityPassedCodeChallenge(opportunity);
  return [
    {
      icon: "users",
      name: `Participant${numProposals === 1 ? "" : "s"}`,
      value: numProposals ? String(numProposals) : EMPTY_STRING
    },
    {
      icon: "star-full",
      iconColor: "c-report-card-icon-highlight",
      name: "Top CC Score",
      value:
        isComplete && highestScore
          ? `${highestScore.toFixed(NUM_SCORE_DECIMALS)}%`
          : EMPTY_STRING
    },
    {
      icon: "star-half",
      iconColor: "c-report-card-icon-highlight",
      name: "Avg. CC Score",
      value:
        isComplete && averageScore
          ? `${averageScore.toFixed(NUM_SCORE_DECIMALS)}%`
          : EMPTY_STRING
    }
  ];
};

const WaitForCodeChallenge: component_.base.ComponentView<State, Msg> = () => {
  return (
    <div>
      Participants will be displayed here once this opportunity has reached the
      Code Challenge.
    </div>
  );
};

const ContextMenuCell: component_.base.View<{
  disabled: boolean;
  loading: boolean;
  proposal: SWUProposalSlim;
  dispatch: component_.base.Dispatch<Msg>;
}> = ({ disabled, loading, proposal, dispatch }) => {
  switch (proposal.status) {
    case SWUProposalStatus.EvaluatedCodeChallenge:
      return (
        <Link
          button
          symbol_={leftPlacement(iconLinkSymbol("stars"))}
          color="info"
          size="sm"
          disabled={disabled || loading}
          loading={loading}
          onClick={() =>
            dispatch(adt("screenInToTeamScenario" as const, proposal.id))
          }>
          Screen In
        </Link>
      );
    case SWUProposalStatus.UnderReviewTeamScenario:
      return (
        <Link
          button
          symbol_={leftPlacement(iconLinkSymbol("ban"))}
          color="danger"
          size="sm"
          disabled={disabled || loading}
          loading={loading}
          onClick={() =>
            dispatch(adt("screenOutFromTeamScenario" as const, proposal.id))
          }>
          Screen Out
        </Link>
      );
    default:
      return null;
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
    tab: "codeChallenge" as const
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

function evaluationTableBodyRows(
  state: Immutable<State>,
  dispatch: component_.base.Dispatch<Msg>
): Table.BodyRows {
  const opportunity = state.opportunity;
  if (!opportunity) return [];
  const isCompleteCodeChallengeLoading = state.completeCodeChallengeLoading > 0;
  const isScreenToFromLoading = !!state.screenToFromLoading;
  const isLoading = isCompleteCodeChallengeLoading || isScreenToFromLoading;
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
            text={swuProposalStatusToTitleCase(p.status, state.viewerUser.type)}
            color={swuProposalStatusToColor(p.status, state.viewerUser.type)}
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
      children: "Code Challenge",
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
            <h4 className="mb-0">Code Challenge Participants</h4>
          </Col>
          <Col xs="12">
            {state.canViewProposals && state.proposals.length ? (
              <EvaluationTable {...props} />
            ) : (
              <WaitForCodeChallenge {...props} />
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
    const isCompleteCodeChallengeLoading =
      state.completeCodeChallengeLoading > 0;
    const isScreenToFromLoading = !!state.screenToFromLoading;
    const isLoading = isCompleteCodeChallengeLoading || isScreenToFromLoading;
    return component_.page.actions.links([
      {
        children: "Complete Code Challenge",
        symbol_: leftPlacement(iconLinkSymbol("code-outline")),
        color: "primary",
        button: true,
        loading: isCompleteCodeChallengeLoading,
        disabled: (() => {
          // At least one proposal already screened in.
          return (
            isLoading ||
            !state.allProposalsScored ||
            !(
              canSWUOpportunityBeScreenedInToTeamScenario(opportunity) &&
              state.proposals.reduce(
                (acc, p) =>
                  acc || p.status === SWUProposalStatus.UnderReviewTeamScenario,
                false as boolean
              )
            )
          );
        })(),
        onClick: () =>
          dispatch(adt("showModal", adt("completeCodeChallenge")) as Msg)
      }
    ]);
  },

  getModal: (state) => {
    if (!state.showModal) {
      return component_.page.modal.hide();
    }
    switch (state.showModal.tag) {
      case "completeCodeChallenge":
        return component_.page.modal.show({
          title: "Complete Code Challenge?",
          onCloseMsg: adt("hideModal") as Msg,
          actions: [
            {
              text: "Complete Code Challenge",
              icon: "code-outline",
              color: "primary",
              button: true,
              msg: adt("completeCodeChallenge")
            },
            {
              text: "Cancel",
              color: "secondary",
              msg: adt("hideModal")
            }
          ],
          body: () =>
            "Are you sure you want to complete the evaluation of this opportunity's Code Challenge? You will no longer be able to screen proponents in or out of the Team Scenario."
        });
    }
  }
};
