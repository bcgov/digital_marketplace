import { adt } from "shared/lib/types";
import {
  CWUOpportunity,
  CWUOpportunitySlim,
  isCWUOpportunityAcceptingProposals
} from "shared/lib/resources/opportunity/code-with-us";
import { OppHelpers } from "front-end/lib/interfaces/opportunities/types";

const helpers: OppHelpers<CWUOpportunitySlim | CWUOpportunity> = {
  list: {
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
  }
};

export default helpers;
