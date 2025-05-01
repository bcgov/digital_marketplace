import { component } from "front-end/lib/framework";
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
import { adt } from "shared/lib/types";
import * as Tab from "front-end/lib/pages/proposal/sprint-with-us/view/tab";
import { compareNumbers } from "shared/lib";
import { SWUTeamQuestionResponseEvaluation } from "shared/lib/resources/evaluations/sprint-with-us/team-questions";

export interface Props {
  proposal: SWUProposal;
  proposals: SWUProposalSlim[];
  panelEvaluations: SWUTeamQuestionResponseEvaluation[];
  evaluation?: SWUTeamQuestionResponseEvaluation;
  tab: Tab.TabId;
}

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

function getRoute({
  panelEvaluations,
  evaluation,
  routeParams
}: {
  panelEvaluations: SWUTeamQuestionResponseEvaluation[];
  evaluation?: SWUTeamQuestionResponseEvaluation;
  routeParams: { proposalId: string; opportunityId: string; tab: Tab.TabId };
}) {
  return panelEvaluations.length
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

/**
 * Browse opportunity's proposals from a tab details view.
 * `proposals` should be filtered appropriately for the tab.
 *
 * @see {@link Props}
 *
 * @param props - proposals, proposal, tab
 * @returns - base view component
 */
const ProposalTeamQuestionsTabCarousel: component.base.View<Props> = ({
  proposals,
  proposal,
  panelEvaluations,
  evaluation,
  tab
}) => {
  proposals = sortProponentsByAnonymousProponentName(proposals);
  const index = proposals.findIndex(
    (otherProposal) => otherProposal.id === proposal.id
  );

  // Safeguard against proposals/proposal prop mismatch
  if (index < 0) {
    return null;
  }

  const prevIndex = index - 1;
  const nextIndex = index + 1;
  const prevRouteParams = proposals[prevIndex]
    ? {
        proposalId: proposals[prevIndex].id,
        opportunityId: proposals[prevIndex].opportunity.id,
        tab
      }
    : null;

  const nextRouteParams = proposals[nextIndex]
    ? {
        proposalId: proposals[nextIndex].id,
        opportunityId: proposals[nextIndex].opportunity.id,
        tab
      }
    : null;

  return (
    <div className="d-flex justify-content-between">
      {prevRouteParams ? (
        <Link
          button
          color="info"
          outline
          symbol_={leftPlacement(iconLinkSymbol("arrow-left"))}
          dest={routeDest(
            getRoute({
              evaluation,
              panelEvaluations,
              routeParams: prevRouteParams
            })
          )}>
          Previous Proponent
        </Link>
      ) : (
        <div />
      )}
      {nextRouteParams ? (
        <Link
          button
          color="primary"
          outline
          symbol_={rightPlacement(iconLinkSymbol("arrow-right"))}
          dest={routeDest(
            getRoute({
              evaluation,
              panelEvaluations,
              routeParams: nextRouteParams
            })
          )}>
          Next Proponent
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
};

export default ProposalTeamQuestionsTabCarousel;
