import { adt } from "shared/lib/types";
import {
  isSWUOpportunityAcceptingProposals,
  SWUOpportunity,
  SWUOpportunitySlim
} from "shared/lib/resources/opportunity/sprint-with-us";
import { OppHelpers } from "front-end/lib/interfaces/opportunities/types";

const helpers: OppHelpers<SWUOpportunitySlim | SWUOpportunity> = {
  list: {
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
  }
};

export default helpers;
