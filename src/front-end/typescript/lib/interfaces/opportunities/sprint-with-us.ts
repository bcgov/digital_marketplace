import { isSWUOpportunityAcceptingProposals, SWUOpportunitySlim } from "shared/lib/resources/opportunity/sprint-with-us";
import { adt } from "shared/lib/types";
import { ListOppHelpers } from "front-end/lib/interfaces/opportunities";

export const swu: ListOppHelpers<SWUOpportunitySlim> = {
  getOppViewRoute(opportunityId) {
    return adt("opportunitySWUView", { opportunityId });
  },
  getOppEditRoute(opportunityId) {
    return adt("opportunitySWUEdit", { opportunityId });
  },
  isOpportunityAcceptingProposals(opportunity) {
    return isSWUOpportunityAcceptingProposals(opportunity);
  },
  getOppDollarAmount(opportunity) {
    return opportunity.totalMaxBudget;
  }
};
