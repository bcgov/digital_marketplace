import { component as component_ } from "front-end/lib/framework";
import Link, {
  iconLinkSymbol,
  leftPlacement,
  rightPlacement,
  routeDest
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

export interface State extends Omit<Params, "viewerUser" | "panelEvaluations"> {
  isConsensus: boolean;
  prevProposal?: SWUProposalSlim;
  prevEvaluation?: SWUTeamQuestionResponseEvaluation;
  nextProposal?: SWUProposalSlim;
  nextEvaluation?: SWUTeamQuestionResponseEvaluation;
}

export type Msg = ADT<
  "onInitResponse",
  [
    SWUTeamQuestionResponseEvaluation | undefined,
    SWUTeamQuestionResponseEvaluation | undefined
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
        evaluation,
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
      evaluation,
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
  isConsensus: boolean,
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
    ? isConsensus
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
  isConsensus: boolean,
  evaluation: SWUTeamQuestionResponseEvaluation | undefined
) {
  const routeParams = {
    proposalId: proposal.id,
    opportunityId: proposal.opportunity.id,
    tab: "teamQuestions" as const
  };
  return isConsensus
    ? evaluation
      ? adt("questionEvaluationConsensusSWUEdit" as const, {
          ...routeParams,
          userId: evaluation.evaluationPanelMember
        })
      : adt("questionEvaluationConsensusSWUCreate" as const, routeParams)
    : evaluation
    ? adt("questionEvaluationIndividualSWUEdit" as const, {
        ...routeParams,
        userId: evaluation.evaluationPanelMember
      })
    : adt("questionEvaluationIndividualSWUCreate" as const, routeParams);
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
