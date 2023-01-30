import { CWUOpportunitySlim, isCWUOpportunityAcceptingProposals } from "shared/lib/resources/opportunity/code-with-us";
import { adt } from "shared/lib/types";
import { ListOppHelpers } from "front-end/lib/interfaces/opportunities";

export const cwu: ListOppHelpers<CWUOpportunitySlim> = {
  getOppViewRoute(opportunityId) {
    return adt("opportunityCWUView", { opportunityId });
  },
  getOppEditRoute(opportunityId) {
    return adt("opportunityCWUEdit", { opportunityId });
  },
  isOpportunityAcceptingProposals(opportunity) {
    return isCWUOpportunityAcceptingProposals(opportunity);
  },
  getOppDollarAmount(opportunity) {
    return opportunity.reward;
  }
};
