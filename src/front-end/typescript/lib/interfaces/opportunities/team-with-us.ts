import { isTWUOpportunityAcceptingProposals, TWUOpportunitySlim } from "shared/lib/resources/opportunity/team-with-us";
import { adt } from "shared/lib/types";
import { ListOppHelpers } from "front-end/lib/interfaces/opportunities";

export const twu: ListOppHelpers<TWUOpportunitySlim> = {
  getOppViewRoute(opportunityId) {
    // TODO: replace with opportunityTWUView
    return adt("notFound", {});
  },
  getOppEditRoute(opportunityId) {
    return adt("opportunityTWUEdit", { opportunityId });
  },
  isOpportunityAcceptingProposals(opportunity) {
    return isTWUOpportunityAcceptingProposals(opportunity)
  },
  getOppDollarAmount(opportunity) {
    return opportunity.maxBudget;
  }
};
