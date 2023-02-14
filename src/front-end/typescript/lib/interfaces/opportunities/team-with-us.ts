import { adt } from "shared/lib/types";
import {
  isTWUOpportunityAcceptingProposals,
  TWUOpportunity,
  TWUOpportunitySlim
} from "shared/lib/resources/opportunity/team-with-us";
import { OppHelpers } from "front-end/lib/interfaces/opportunities/types";

const helpers: OppHelpers<TWUOpportunitySlim | TWUOpportunity> = {
  list: {
    getOppViewRoute(opportunityId) {
      return adt("opportunityTWUView", { opportunityId });
    },
    getOppEditRoute(opportunityId) {
      return adt("opportunityTWUEdit", { opportunityId });
    },
    isOpportunityAcceptingProposals(opportunity) {
      return isTWUOpportunityAcceptingProposals(opportunity);
    },
    getOppDollarAmount(opportunity) {
      return opportunity.maxBudget;
    }
  }
};

export default helpers;
