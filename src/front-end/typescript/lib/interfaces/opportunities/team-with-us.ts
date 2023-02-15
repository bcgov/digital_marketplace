import { adt } from "shared/lib/types";
import {
  DEFAULT_OPPORTUNITY_TITLE,
  isTWUOpportunityAcceptingProposals,
  TWUOpportunity,
  TWUOpportunitySlim
} from "shared/lib/resources/opportunity/team-with-us";
import {
  GetOppEditRoute,
  OppHelpers
} from "front-end/lib/interfaces/opportunities/types";
import {
  twuOpportunityStatusToColor,
  twuOpportunityStatusToTitleCase
} from "front-end/lib/pages/opportunity/team-with-us/lib";

const getOppEditRoute: GetOppEditRoute = (opportunityId) => {
  return adt("opportunityTWUEdit", { opportunityId });
};

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
  },
  dashboard: {
    getDefaultTitle() {
      return DEFAULT_OPPORTUNITY_TITLE;
    },
    getOppEditRoute,
    getOppStatusColor(status) {
      return twuOpportunityStatusToColor(status);
    },
    getOppStatusText(status) {
      return twuOpportunityStatusToTitleCase(status);
    }
  }
};

export default helpers;
