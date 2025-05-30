import { component as component_ } from "front-end/lib/framework";
import Link, {
  iconLinkSymbol,
  leftPlacement,
  rightPlacement
} from "front-end/lib/views/link";
import React from "react";
import {
  TWUProposal,
  TWUProposalSlim
} from "shared/lib/resources/proposal/team-with-us";
import { ADT, adt } from "shared/lib/types";
import { compareNumbers } from "shared/lib";
import { TWUResourceQuestionResponseEvaluation } from "shared/lib/resources/evaluations/team-with-us/resource-questions";
import * as api from "front-end/lib/http/api";
import { User } from "shared/lib/resources/user";
import { getEvaluationActionType } from "../../view/tab/resource-questions";

export interface Params {
  viewerUser: User;
  proposal: TWUProposal;
  proposals: TWUProposalSlim[];
  panelEvaluations: TWUResourceQuestionResponseEvaluation[];
  evaluation: TWUResourceQuestionResponseEvaluation | undefined;
}

export interface State extends Omit<Params, "viewerUser"> {
  prevProposal?: TWUProposalSlim;
  prevEvaluation?: TWUResourceQuestionResponseEvaluation;
  nextProposal?: TWUProposalSlim;
  nextEvaluation?: TWUResourceQuestionResponseEvaluation;
}

export type Msg =
  | ADT<
      "onInitResponse",
      [
        TWUResourceQuestionResponseEvaluation | undefined,
        TWUResourceQuestionResponseEvaluation | undefined
      ]
    >
  | ADT<"saveAndNavigate", ReturnType<typeof getRoute>>;

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
  proposals: TWUProposalSlim[]
) {
  return proposals
    .reduce<(TWUProposalSlim & { order: number })[]>((acc, p) => {
      const order = Number(p.anonymousProponentName.match(/\d+/)?.at(0));
      return isNaN(order) ? acc : [...acc, { ...p, order }];
    }, [])
    .sort((a, b) => {
      return compareNumbers(a.order, b.order) * 1;
    });
}

function getEvaluationResource(
  proposal: TWUProposalSlim | undefined,
  panelEvaluations: TWUResourceQuestionResponseEvaluation[],
  evaluation: TWUResourceQuestionResponseEvaluation | undefined,
  viewerUser: User
) {
  const userId = evaluation?.evaluationPanelMember ?? viewerUser.id;
  const callback = (
    response: api.ResponseValidation<
      TWUResourceQuestionResponseEvaluation,
      string[]
    >
  ) => (api.isValid(response) ? response.value : undefined);
  return proposal
    ? panelEvaluations.length > 0
      ? api.proposals.twu.resourceQuestions.consensuses.readOne(proposal.id)(
          userId,
          callback
        )
      : api.proposals.twu.resourceQuestions.evaluations.readOne(proposal.id)(
          userId,
          callback
        )
    : component_.cmd.dispatch(undefined);
}

function getRoute(
  proposal: TWUProposalSlim,
  panelEvaluations: TWUResourceQuestionResponseEvaluation[],
  evaluation: TWUResourceQuestionResponseEvaluation | undefined
) {
  const routeParams = {
    proposalId: proposal.id,
    opportunityId: proposal.opportunity.id,
    tab: "resourceQuestions" as const
  };
  const action = getEvaluationActionType(panelEvaluations, evaluation);
  switch (action.type) {
    case "create-consensus":
      return adt("questionEvaluationConsensusTWUCreate" as const, routeParams);
    case "edit-consensus":
      return adt("questionEvaluationConsensusTWUEdit" as const, {
        ...routeParams,
        userId: action.evaluation.evaluationPanelMember
      });
    case "create-individual":
      return adt("questionEvaluationIndividualTWUCreate" as const, routeParams);
    case "edit-individual":
      return adt("questionEvaluationIndividualTWUEdit" as const, {
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
