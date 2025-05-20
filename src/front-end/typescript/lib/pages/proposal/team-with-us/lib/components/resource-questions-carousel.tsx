import { component as component_ } from "front-end/lib/framework";
import Link, {
  iconLinkSymbol,
  leftPlacement,
  rightPlacement,
  routeDest
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

export interface Params {
  viewerUser: User;
  proposal: TWUProposal;
  proposals: TWUProposalSlim[];
  panelEvaluations: TWUResourceQuestionResponseEvaluation[];
  evaluation?: TWUResourceQuestionResponseEvaluation;
}

export interface State extends Omit<Params, "viewerUser" | "panelEvaluations"> {
  isConsensus: boolean;
  prevProposal?: TWUProposalSlim;
  prevEvaluation?: TWUResourceQuestionResponseEvaluation;
  nextProposal?: TWUProposalSlim;
  nextEvaluation?: TWUResourceQuestionResponseEvaluation;
}

export type Msg = ADT<
  "onInitResponse",
  [
    TWUResourceQuestionResponseEvaluation | undefined,
    TWUResourceQuestionResponseEvaluation | undefined
  ]
>;

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
  const isConsensus = panelEvaluations.length > 0;
  // Safeguard against proposals/proposal prop mismatch
  if (index < 0) {
    return [
      {
        prevProposal: undefined,
        prevEvaluation: undefined,
        nextProposal: undefined,
        nextEvaluation: undefined,
        proposal,
        proposals,
        viewerUser,
        isConsensus
      },
      []
    ];
  }

  const prevProposal = proposals[index - 1];
  const nextProposal = proposals[index + 1];

  return [
    {
      prevProposal,
      prevEvaluation: undefined,
      nextProposal,
      nextEvaluation: undefined,
      proposal,
      proposals,
      viewerUser,
      isConsensus
    },
    [
      component_.cmd.join(
        getEvaluationResource(
          prevProposal,
          isConsensus,
          evaluation,
          viewerUser
        ),
        getEvaluationResource(
          nextProposal,
          isConsensus,
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
  isConsensus: boolean,
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
    ? isConsensus
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
  isConsensus: boolean,
  evaluation: TWUResourceQuestionResponseEvaluation | undefined
) {
  const routeParams = {
    proposalId: proposal.id,
    opportunityId: proposal.opportunity.id,
    tab: "resourceQuestions" as const
  };
  return isConsensus
    ? evaluation
      ? adt("questionEvaluationConsensusTWUEdit" as const, {
          ...routeParams,
          userId: evaluation.evaluationPanelMember
        })
      : adt("questionEvaluationConsensusTWUCreate" as const, routeParams)
    : evaluation
    ? adt("questionEvaluationIndividualTWUEdit" as const, {
        ...routeParams,
        userId: evaluation.evaluationPanelMember
      })
    : adt("questionEvaluationIndividualTWUCreate" as const, routeParams);
}

export const view: component_.base.View<
  component_.base.ComponentViewProps<State, Msg>
> = ({ state }) => {
  const {
    isConsensus,
    prevProposal,
    prevEvaluation,
    nextProposal,
    nextEvaluation
  } = state;
  return (
    <div className="d-flex justify-content-between">
      {prevProposal ? (
        <Link
          button
          color="info"
          outline
          symbol_={leftPlacement(iconLinkSymbol("arrow-left"))}
          dest={routeDest(getRoute(prevProposal, isConsensus, prevEvaluation))}>
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
          dest={routeDest(getRoute(nextProposal, isConsensus, nextEvaluation))}>
          Next Proponent
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
};
