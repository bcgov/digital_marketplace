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

export interface Props {
  proposal: SWUProposal;
  proposals: SWUProposalSlim[];
  tab: Tab.TabId;
}

const ProposalTabCarousel: component.base.View<Props> = ({
  proposals,
  proposal,
  tab
}) => {
  const index = proposals.findIndex(
    (otherProposal) => otherProposal.id === proposal.id
  );

  // Safeguard against proposals/proposal prop mismatch
  if (index < 0) {
    return null;
  }

  const prevIndex = index - 1;
  const nextIndex = index + 1;
  const prevRouteParams = proposals[nextIndex]
    ? {
        proposalId: proposals[nextIndex].id,
        opportunityId: proposals[nextIndex].opportunity.id,
        tab
      }
    : null;

  const nextRouteParams = proposals[prevIndex]
    ? {
        proposalId: proposals[prevIndex].id,
        opportunityId: proposals[prevIndex].opportunity.id,
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
          dest={routeDest(adt("proposalSWUView", prevRouteParams))}>
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
          dest={routeDest(adt("proposalSWUView", nextRouteParams))}>
          Next Proponent
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
};

export default ProposalTabCarousel;
