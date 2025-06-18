import { component as component_ } from "front-end/lib/framework";
import Link, {
  iconLinkSymbol,
  leftPlacement,
  rightPlacement
} from "front-end/lib/views/link";
import React from "react";
import {
  SWUProposal,
  SWUProposalSlim
} from "shared/lib/resources/proposal/sprint-with-us";
import { ADT, adt } from "shared/lib/types";
import { compareNumbers } from "shared/lib";
import { SWUTeamQuestionResponseEvaluation } from "shared/lib/resources/evaluations/sprint-with-us/team-questions";
import * as api from "front-end/lib/http/api";
import { User } from "shared/lib/resources/user";

export interface Params {
  viewerUser: User;
  proposal: SWUProposal;
  proposals: SWUProposalSlim[];
  panelEvaluations: SWUTeamQuestionResponseEvaluation[];
  evaluation: SWUTeamQuestionResponseEvaluation | undefined;
}

export interface State extends Omit<Params, "viewerUser"> {
  prevProposal?: SWUProposalSlim;
  prevEvaluation?: SWUTeamQuestionResponseEvaluation;
  nextProposal?: SWUProposalSlim;
  nextEvaluation?: SWUTeamQuestionResponseEvaluation;
}

export type Msg =
  | ADT<
      "onInitResponse",
      [
        SWUTeamQuestionResponseEvaluation | undefined,
        SWUTeamQuestionResponseEvaluation | undefined
      ]
    >
  | ADT<"saveAndNavigate", ReturnType<typeof getRoute>>;

export function getEvaluationActionType(
  panelEvaluations: SWUTeamQuestionResponseEvaluation[],
  evaluation?: SWUTeamQuestionResponseEvaluation
) {
  return panelEvaluations.length > 0
    ? evaluation
      ? ({ type: "edit-consensus", evaluation } as const)
      : ({ type: "create-consensus" } as const)
    : evaluation
    ? ({ type: "edit-individual", evaluation } as const)
    : ({ type: "create-individual" } as const);
}

export const init: component_.base.Init<Params, State, Msg> = ({
  viewerUser,
  proposals,
  proposal,
  panelEvaluations,
  evaluation
}) => {
  proposals = sortProponentsByAnonymousProponentName(proposals);
  const index = proposals.findIndex(
    (otherProposal) => otherProposal.id === proposal.id
  );
  // Safeguard against proposals/proposal prop mismatch
  if (index < 0) {
    return [
      {
        evaluation,
        prevProposal: undefined,
        prevEvaluation: undefined,
        nextProposal: undefined,
        nextEvaluation: undefined,
        proposal,
        proposals,
        viewerUser,
        panelEvaluations
      },
      []
    ];
  }

  const prevProposal = proposals[index - 1];
  const nextProposal = proposals[index + 1];

  return [
    {
      evaluation,
      prevProposal,
      prevEvaluation: undefined,
      nextProposal,
      nextEvaluation: undefined,
      proposal,
      proposals,
      viewerUser,
      panelEvaluations
    },
    [
      component_.cmd.join(
        getEvaluationResource(
          prevProposal,
          panelEvaluations,
          evaluation,
          viewerUser
        ),
        getEvaluationResource(
          nextProposal,
          panelEvaluations,
          evaluation,
          viewerUser
        ),
        (prevEvaluation, nextEvaluation) => {
          return adt("onInitResponse", [prevEvaluation, nextEvaluation]) as Msg;
        }
      )
    ]
  ];
};

export const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "onInitResponse": {
      const [prevEvaluation, nextEvaluation] = msg.value;
      return [
        state
          .set("prevEvaluation", prevEvaluation)
          .set("nextEvaluation", nextEvaluation),
        []
      ];
    }
    case "saveAndNavigate": {
      return [state, []];
    }
  }
};

/**
 * Sorts proponents by anonymous proponent name in ascending order.
 *
 * @param proposals - unsorted proponents
 * @returns - sorted proponents with order property
 */
export function sortProponentsByAnonymousProponentName(
  proposals: SWUProposalSlim[]
) {
  return proposals
    .reduce<(SWUProposalSlim & { order: number })[]>((acc, p) => {
      const order = Number(p.anonymousProponentName.match(/\d+/)?.at(0));
      return isNaN(order) ? acc : [...acc, { ...p, order }];
    }, [])
    .sort((a, b) => {
      return compareNumbers(a.order, b.order) * 1;
    });
}

function getEvaluationResource(
  proposal: SWUProposalSlim | undefined,
  panelEvaluations: SWUTeamQuestionResponseEvaluation[],
  evaluation: SWUTeamQuestionResponseEvaluation | undefined,
  viewerUser: User
) {
  const userId = evaluation?.evaluationPanelMember ?? viewerUser.id;
  const callback = (
    response: api.ResponseValidation<
      SWUTeamQuestionResponseEvaluation,
      string[]
    >
  ) => (api.isValid(response) ? response.value : undefined);
  return proposal
    ? panelEvaluations.length > 0
      ? api.proposals.swu.teamQuestions.consensuses.readOne(proposal.id)(
          userId,
          callback
        )
      : api.proposals.swu.teamQuestions.evaluations.readOne(proposal.id)(
          userId,
          callback
        )
    : component_.cmd.dispatch(undefined);
}

function getRoute(
  proposal: SWUProposalSlim,
  panelEvaluations: SWUTeamQuestionResponseEvaluation[],
  evaluation: SWUTeamQuestionResponseEvaluation | undefined
) {
  const routeParams = {
    proposalId: proposal.id,
    opportunityId: proposal.opportunity.id,
    tab: "teamQuestions" as const
  };
  const action = getEvaluationActionType(panelEvaluations, evaluation);
  switch (action.type) {
    case "create-consensus":
      return adt("questionEvaluationConsensusSWUCreate" as const, routeParams);
    case "edit-consensus":
      return adt("questionEvaluationConsensusSWUEdit" as const, {
        ...routeParams,
        userId: action.evaluation.evaluationPanelMember
      });
    case "create-individual":
      return adt("questionEvaluationIndividualSWUCreate" as const, routeParams);
    case "edit-individual":
      return adt("questionEvaluationIndividualSWUEdit" as const, {
        ...routeParams,
        userId: action.evaluation.evaluationPanelMember
      });
  }
}

export const view: component_.base.View<
  component_.base.ComponentViewProps<State, Msg>
> = ({ state, dispatch }) => {
  const {
    prevProposal,
    prevEvaluation,
    nextProposal,
    nextEvaluation,
    panelEvaluations
  } = state;
  return (
    <div className="d-flex justify-content-between">
      {prevProposal ? (
        <Link
          button
          color="info"
          outline
          symbol_={leftPlacement(iconLinkSymbol("arrow-left"))}
          onClick={() =>
            dispatch(
              adt(
                "saveAndNavigate",
                getRoute(prevProposal, panelEvaluations, prevEvaluation)
              )
            )
          }>
          Previous Proponent
        </Link>
      ) : (
        <div />
      )}
      {nextProposal ? (
        <Link
          button
          color="primary"
          outline
          symbol_={rightPlacement(iconLinkSymbol("arrow-right"))}
          onClick={() =>
            dispatch(
              adt(
                "saveAndNavigate",
                getRoute(nextProposal, panelEvaluations, nextEvaluation)
              )
            )
          }>
          Next Proponent
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
};
