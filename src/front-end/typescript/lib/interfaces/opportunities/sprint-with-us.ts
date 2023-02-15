import { adt } from "shared/lib/types";
import {
  DEFAULT_OPPORTUNITY_TITLE,
  isSWUOpportunityAcceptingProposals,
  SWUOpportunity,
  SWUOpportunitySlim
} from "shared/lib/resources/opportunity/sprint-with-us";
import {
  GetOppEditRoute,
  OppHelpers
} from "front-end/lib/interfaces/opportunities/types";
import {
  swuOpportunityStatusToColor,
  swuOpportunityStatusToTitleCase
} from "front-end/lib/pages/opportunity/sprint-with-us/lib";

const getOppEditRoute: GetOppEditRoute = (opportunityId) => {
  return adt("opportunitySWUEdit", { opportunityId });
};

const helpers: OppHelpers<SWUOpportunitySlim | SWUOpportunity> = {
  list: {
    getOppViewRoute(opportunityId) {
      return adt("opportunitySWUView", { opportunityId });
    },
    getOppEditRoute,
    isOpportunityAcceptingProposals(opportunity) {
      return isSWUOpportunityAcceptingProposals(opportunity);
    },
    getOppDollarAmount(opportunity) {
      return opportunity.totalMaxBudget;
    }
  },
  dashboard: {
    getDefaultTitle() {
      return DEFAULT_OPPORTUNITY_TITLE;
    },
    getOppEditRoute,
    getOppStatusColor(status) {
      return swuOpportunityStatusToColor(status);
    },
    getOppStatusText(status) {
      return swuOpportunityStatusToTitleCase(status);
    }
  }
};

export default helpers;
