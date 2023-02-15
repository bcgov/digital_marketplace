import { adt } from "shared/lib/types";
import {
  CWUOpportunity,
  CWUOpportunitySlim,
  isCWUOpportunityAcceptingProposals,
  DEFAULT_OPPORTUNITY_TITLE
} from "shared/lib/resources/opportunity/code-with-us";
import {
  GetOppEditRoute,
  OppHelpers
} from "front-end/lib/interfaces/opportunities/types";
import {
  cwuOpportunityStatusToColor,
  cwuOpportunityStatusToTitleCase
} from "front-end/lib/pages/opportunity/code-with-us/lib";

const getOppEditRoute: GetOppEditRoute = (opportunityId) => {
  return adt("opportunityCWUEdit", { opportunityId });
};

const helpers: OppHelpers<CWUOpportunitySlim | CWUOpportunity> = {
  list: {
    getOppViewRoute(opportunityId) {
      return adt("opportunityCWUView", { opportunityId });
    },
    getOppEditRoute,
    isOpportunityAcceptingProposals(opportunity) {
      return isCWUOpportunityAcceptingProposals(opportunity);
    },
    getOppDollarAmount(opportunity) {
      return opportunity.reward;
    }
  },
  dashboard: {
    getDefaultTitle() {
      return DEFAULT_OPPORTUNITY_TITLE;
    },
    getOppEditRoute,
    getOppStatusColor(status) {
      return cwuOpportunityStatusToColor(status);
    },
    getOppStatusText(status) {
      return cwuOpportunityStatusToTitleCase(status);
    }
  }
};

export default helpers;
