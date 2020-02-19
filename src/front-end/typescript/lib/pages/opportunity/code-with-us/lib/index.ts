import { ThemeColor } from 'front-end/lib/types';
import { CWUOpportunityStatus } from 'shared/lib/resources/opportunity/code-with-us';
import { CWUProposalStatus } from 'shared/lib/resources/proposal/code-with-us';

export function cwuOpportunityStatusToColor(s: CWUOpportunityStatus): ThemeColor {
  switch (s) {
    case CWUOpportunityStatus.Draft: return 'secondary';
    case CWUOpportunityStatus.Published: return 'success';
    case CWUOpportunityStatus.Evaluation: return 'warning';
    case CWUOpportunityStatus.Awarded: return 'success';
    case CWUOpportunityStatus.Suspended: return 'secondary';
    case CWUOpportunityStatus.Canceled: return 'danger';
  }
}

export function cwuOpportunityStatusToTitleCase(s: CWUOpportunityStatus): string {
  switch (s) {
    case CWUOpportunityStatus.Draft: return 'Draft';
    case CWUOpportunityStatus.Published: return 'Published';
    case CWUOpportunityStatus.Evaluation: return 'Evaluation';
    case CWUOpportunityStatus.Awarded: return 'Awarded';
    case CWUOpportunityStatus.Suspended: return 'Suspended';
    case CWUOpportunityStatus.Canceled: return 'Cancelled'; // Use British spelling for copy.
  }
}
export function cwuProposalStatusToColor(s: CWUProposalStatus): ThemeColor {
  switch (s) {
    case CWUProposalStatus.Draft        : return 'secondary';
    case CWUProposalStatus.Submitted    : return 'success';
    case CWUProposalStatus.UnderReview  : return 'warning';
    case CWUProposalStatus.Evaluated    : return 'blue';
    case CWUProposalStatus.Awarded      : return 'success';
    case CWUProposalStatus.NotAwarded   : return 'blue';
    case CWUProposalStatus.Disqualified : return 'danger';
    case CWUProposalStatus.Withdrawn    : return 'danger';
  }
}

export function cwuProposalStatusToTitleCase(s: CWUProposalStatus): string {
  switch (s) {
    case CWUProposalStatus.Draft        : return 'Draft';
    case CWUProposalStatus.Submitted    : return 'Submitted';
    case CWUProposalStatus.UnderReview  : return 'Under Review';
    case CWUProposalStatus.Evaluated    : return 'Evaluated';
    case CWUProposalStatus.Awarded      : return 'Awarded';
    case CWUProposalStatus.NotAwarded   : return 'Not Awarded';
    case CWUProposalStatus.Disqualified : return 'Disqualified';
    case CWUProposalStatus.Withdrawn    : return 'Withdrawn';
  }
}
