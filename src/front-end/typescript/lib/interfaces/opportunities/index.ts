import { Route } from "front-end/lib/app/types";
import { Id } from "shared/lib/types";
import { cwu } from 'front-end/lib/interfaces/opportunities/code-with-us';
import { swu } from 'front-end/lib/interfaces/opportunities/sprint-with-us';
import { twu } from 'front-end/lib/interfaces/opportunities/team-with-us';
import { Opportunity } from "front-end/lib/pages/opportunity/list";

export type ListOppHelpers<Opp extends Opportunity['value']> = {
  getOppViewRoute(id: Id): Route;
  getOppEditRoute(id: Id): Route;
  isOpportunityAcceptingProposals(opportunity: Opp): boolean;
  getOppDollarAmount(opportunity: Opp): number
}

export function getListOppHelpers(opportunity: Opportunity): ListOppHelpers<Opportunity['value']> {
  return {
    cwu,
    swu,
    twu
  }[opportunity.tag];
}
